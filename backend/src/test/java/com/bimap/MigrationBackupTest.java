package com.bimap;

import module java.base;
import java.sql.DriverManager;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import static org.assertj.core.api.Assertions.assertThat;

class MigrationBackupTest {

    @Test
    void upgradesExistingDatabaseAndRestoresAConsistentBackup(@TempDir Path directory) throws Exception {
        var url = "jdbc:sqlite:" + directory.resolve("original.db");
        Flyway.configure().dataSource(url, null, null).target("2").load().migrate();
        try (var connection = DriverManager.getConnection(url); var statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO users (name,surname,email,password,role,created_at,updated_at)
                    VALUES ('Old','User','existing@bimap.test','existing-hash','ADMINISTRATOR',0,0)""");
            statement.executeUpdate("""
                    INSERT INTO form (region,province,municipality,address,good_naming,number,goodid,latitude,longitude)
                    VALUES ('Piemonte','Alessandria','Cremolino','via Umberto I','Asset',3,7168,44.6,8.5)""");
        }
        Flyway.configure().dataSource(url, null, null).load().migrate();
        var backup = directory.resolve("backup.db");
        try (var connection = DriverManager.getConnection(url); var statement = connection.prepareStatement("VACUUM INTO ?")) {
            statement.setString(1, backup.toString());
            statement.execute();
        }
        try (var connection = DriverManager.getConnection("jdbc:sqlite:" + backup); var statement = connection.createStatement()) {
            try (var rows = statement.executeQuery("SELECT email,password,token_version FROM users")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString("email")).isEqualTo("existing@bimap.test");
                assertThat(rows.getString("password")).isEqualTo("existing-hash");
                assertThat(rows.getLong("token_version")).isZero();
            }
            try (var rows = statement.executeQuery("SELECT count(*) FROM form")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getInt(1)).isEqualTo(1);
            }
            try (var rows = statement.executeQuery("PRAGMA integrity_check")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("ok");
            }
        }
    }
}
