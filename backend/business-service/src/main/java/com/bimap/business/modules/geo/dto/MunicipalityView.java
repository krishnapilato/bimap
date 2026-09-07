package com.bimap.business.modules.geo.dto;

/// A municipality with the identifiers a registration form needs.
///
/// @param istatCode     Six-digit ISTAT code, the primary key of Italian municipalities.
/// @param cadastralCode Four-character Agenzia delle Entrate code, used on cadastral records.
/// @author Khova Krishna Pilato
public record MunicipalityView(
        String istatCode,
        String name,
        String cadastralCode,
        String postalCode,
        String province,
        String provinceCode,
        String region,
        Integer population,
        Double latitude,
        Double longitude) {
}
