package com.bimap.business.modules.geo.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/// One province exactly as Comuni-ITA returns it.
/// @author Khova Krishna Pilato
@JsonIgnoreProperties(ignoreUnknown = true)
public record ProvinciaResource(String codice, String nome, String sigla, String regione) {
}
