package com.bimap.repository;

import module java.base;

import com.bimap.model.HeritageAsset;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ReferenceDataRepository {

    private final JdbcClient jdbc;

    public ReferenceDataRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<HeritageAsset> findAssets() {
        return jdbc.sql("""
                        SELECT id, idbene, prov, comune, indirizzo, civico, localizzazione, denominazione, provv_tutela, proprieta, catato, trascrizione, vincolo
                        FROM tables ORDER BY id""")
                .query(HeritageAsset.class)
                .list();
    }

    public List<String> searchRegions(String text) {
        return search("SELECT DISTINCT regione FROM listacomuni WHERE regione LIKE :pattern ESCAPE '\\' ORDER BY regione LIMIT 4", text);
    }

    public List<String> searchProvinces(String text) {
        return search("SELECT DISTINCT provincia FROM listacomuni WHERE provincia LIKE :pattern ESCAPE '\\' ORDER BY provincia LIMIT 4", text);
    }

    public List<String> searchMunicipalities(String text) {
        return search("SELECT DISTINCT comune FROM listacomuni WHERE comune LIKE :pattern ESCAPE '\\' ORDER BY comune LIMIT 4", text);
    }

    private List<String> search(String sql, String text) {
        var pattern = "%" + text.replaceAll("[\\\\%_]", "\\\\$0") + "%";
        return jdbc.sql(sql).param("pattern", pattern).query(String.class).list();
    }
}
