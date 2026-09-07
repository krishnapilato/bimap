package com.bimap.business.modules.geo.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/// Search results from codiceunivoco.it, the directory of Italian public bodies.
/// @author Khova Krishna Pilato
@JsonIgnoreProperties(ignoreUnknown = true)
public record CodiceUnivocoResponse(String query, Integer totale, List<Entry> risultati) {

    public CodiceUnivocoResponse {
        risultati = risultati == null ? List.of() : List.copyOf(risultati);
    }

    /// @author Khova Krishna Pilato
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Entry(
            String tipo,
            String denominazione,
            @JsonProperty("codice_ipa") String codiceIpa,
            @JsonProperty("codice_fiscale") String codiceFiscale,
            String categoria,
            @JsonProperty("codice_principale") String codicePrincipale,
            @JsonProperty("n_uffici") Integer numeroUffici,
            Comune comune,
            String url) {

        /// @author Khova Krishna Pilato
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record Comune(String nome, String provincia, String regione) {
        }
    }
}
