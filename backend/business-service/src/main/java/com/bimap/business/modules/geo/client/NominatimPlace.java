package com.bimap.business.modules.geo.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/// One OpenStreetMap search result.
/// @author Khova Krishna Pilato
@JsonIgnoreProperties(ignoreUnknown = true)
public record NominatimPlace(
        @JsonProperty("place_id") Long placeId,
        @JsonProperty("osm_type") String osmType,
        String lat,
        String lon,
        @JsonProperty("display_name") String displayName,
        String type,
        Double importance,
        Address address) {

    /// Nominatim names the settlement differently depending on how it is classified upstream,
    /// so the first non-null of city, town, village or municipality is the one to use.
    /// @author Khova Krishna Pilato
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Address(
            @JsonProperty("house_number") String houseNumber,
            String road,
            String suburb,
            String city,
            String town,
            String village,
            String municipality,
            String county,
            String state,
            String postcode,
            String country,
            @JsonProperty("country_code") String countryCode) {

        public String settlement() {
            return firstPresent(city, town, village, municipality);
        }

        private static String firstPresent(String... candidates) {
            for (var candidate : candidates) {
                if (candidate != null && !candidate.isBlank()) {
                    return candidate;
                }
            }
            return null;
        }
    }

    public Double latitude() {
        return parse(lat);
    }

    public Double longitude() {
        return parse(lon);
    }

    private static Double parse(String value) {
        try {
            return value == null ? null : Double.valueOf(value);
        } catch (NumberFormatException unparseable) {
            return null;
        }
    }
}
