package com.bimap;

import module java.base;

import com.bimap.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.simple.JdbcClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PersistenceTest extends ApiTest {

    @Autowired
    private JdbcClient jdbc;

    @Test
    void appliesEveryMigrationAndLoadsReferenceData() {
        assertThat(jdbc.sql("SELECT version FROM flyway_schema_history WHERE success = 1 ORDER BY installed_rank").query(String.class).list()).containsExactly("1", "2", "3", "4");
        assertThat(jdbc.sql("SELECT count(*) FROM tables").query(Long.class).single()).isEqualTo(687);
        assertThat(jdbc.sql("SELECT count(*) FROM listacomuni").query(Long.class).single()).isEqualTo(3590);
    }

    @Test
    void runsWithForeignKeysWalAndABusyTimeout() {
        assertThat(jdbc.sql("PRAGMA foreign_keys").query(Integer.class).single()).isEqualTo(1);
        assertThat(jdbc.sql("PRAGMA journal_mode").query(String.class).single()).isEqualToIgnoringCase("wal");
        assertThat(jdbc.sql("PRAGMA busy_timeout").query(Integer.class).single()).isEqualTo(5000);
    }

    @Test
    void emailsAreUniqueIgnoringCase() {
        createUser("unique@bimap.test", User.Role.USER, true);

        assertThat(users.findByEmail("UNIQUE@bimap.test")).isPresent();
        assertThat(users.existsByEmail("Unique@Bimap.Test")).isTrue();
        assertThatThrownBy(() -> createUser("Unique@BIMAP.test", User.Role.USER, true)).isInstanceOf(DataAccessException.class).hasMessageContaining("UNIQUE");
    }

    @Test
    void storesTimestampsAndFlags() {
        var before = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        var user = createUser("stamped@bimap.test", User.Role.MANAGER, false);
        users.flush();

        var row = jdbc.sql("SELECT role, enabled, locked, created_at, updated_at FROM users WHERE id = ?").param(user.getId()).query().singleRow();
        assertThat(row.get("role")).isEqualTo("MANAGER");
        assertThat(row.get("enabled")).isEqualTo(0);
        assertThat(row.get("locked")).isEqualTo(0);
        assertThat(row.get("created_at")).isNotNull();
        assertThat(users.findById(user.getId())).get().satisfies(saved -> assertThat(saved.getCreated()).isAfterOrEqualTo(before.minusSeconds(1)));
    }

    @Test
    void databaseRejectsRowsTheApiWouldReject() {
        assertThatThrownBy(() -> jdbc.sql("INSERT INTO users (name, surname, email, password, role, created_at, updated_at) VALUES ('a', 'b', 'c@d.it', 'x', 'ROOT', 0, 0)").update())
                .isInstanceOf(DataAccessException.class).hasMessageContaining("CHECK");
        assertThatThrownBy(() -> jdbc.sql("INSERT INTO form (region, province, municipality, address, good_naming, number, goodid, latitude, longitude) VALUES ('a', 'b', 'c', 'd', 'e', 1, 1, 91, 0)").update())
                .isInstanceOf(DataAccessException.class).hasMessageContaining("CHECK");
        assertThatThrownBy(() -> jdbc.sql("INSERT INTO form (region, province, municipality, address, good_naming, number, goodid, latitude, longitude) VALUES (NULL, 'b', 'c', 'd', 'e', 1, 1, 0, 0)").update())
                .isInstanceOf(DataAccessException.class).hasMessageContaining("NOT NULL");
    }

    @Test
    void repairsReferenceEncodingWithoutDroppingRows() {
        assertThat(jdbc.sql("SELECT comune FROM listacomuni WHERE id = 1").query(String.class).single()).isEqualTo("Agliè");
        assertThat(jdbc.sql("SELECT comune FROM listacomuni WHERE id = 85").query(String.class).single()).isEqualTo("Ciriè");
        assertThat(jdbc.sql("SELECT comune FROM listacomuni WHERE id = 1420").query(String.class).single()).isEqualTo("Cantù");
        assertThat(jdbc.sql("SELECT indirizzo FROM tables WHERE id = 75").query(String.class).single()).isEqualTo("V.le Unità d'Italia");
        assertThat(jdbc.sql("SELECT count(*) FROM listacomuni WHERE comune LIKE '%Ã%' OR comune LIKE '%Â%'").query(Long.class).single()).isZero();
    }
}
