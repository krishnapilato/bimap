package com.bimap.business.modules.geo.dto;

/// A resolved address: what the caller typed, turned into a postcode and a point on the map.
/// @author Khova Krishna Pilato
public record AddressView(
        String label,
        String street,
        String houseNumber,
        String postalCode,
        String municipality,
        String province,
        String region,
        Double latitude,
        Double longitude) {
}
