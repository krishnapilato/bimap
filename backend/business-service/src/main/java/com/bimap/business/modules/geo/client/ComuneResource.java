package com.bimap.business.modules.geo.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/// One municipality exactly as Comuni-ITA returns it.
///
/// Only the members we publish are declared; the rest of the upstream payload (contact
/// addresses, phone and fax numbers) is skipped during parsing rather than carried around.
///
/// @author Khova Krishna Pilato
@JsonIgnoreProperties(ignoreUnknown = true)
public record ComuneResource(
        String codice,
        String nome,
        String nomeStraniero,
        String codiceCatastale,
        String cap,
        Provincia provincia,
        Integer popolazione,
        Coordinate coordinate) {

    /// @author Khova Krishna Pilato
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Provincia(String nome, String sigla, String codice, String regione) {
    }

    /// @author Khova Krishna Pilato
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Coordinate(Double lat, Double lng) {
    }
}
