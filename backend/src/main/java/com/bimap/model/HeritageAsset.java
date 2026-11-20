package com.bimap.model;

public record HeritageAsset(Long id, Long idbene, String prov, String comune, String indirizzo, int civico,
                            String localizzazione,
                            String denominazione, String provvTutela, String proprieta, String catato,
                            String trascrizione, String vincolo) {
}
