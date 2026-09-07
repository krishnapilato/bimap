package com.bimap.business.modules.geo.client;

/// One structured address lookup, carrying whatever the guided form has narrowed down so far.
///
/// Every member except the street is optional, which is what lets the same call serve both a
/// step of the cascade (region and province already chosen) and a standalone search.
///
/// @author Khova Krishna Pilato
public record AddressQuery(
        String street,
        String municipality,
        String province,
        String region,
        String postalCode,
        String freeText,
        int limit) {

    public AddressQuery {
        limit = limit < 1 ? 5 : Math.min(limit, 20);
    }

    public static AddressQuery of(String street, String municipality, String province, String region, int limit) {
        return new AddressQuery(street, municipality, province, region, null, null, limit);
    }

    public static AddressQuery freeText(String text, int limit) {
        return new AddressQuery(null, null, null, null, null, text, limit);
    }

    public boolean isFreeText() {
        return freeText != null && !freeText.isBlank();
    }

    /// Cache key: the same narrowed lookup must not be answered from a wider one.
    public String key() {
        return String.join("|",
                nullSafe(street), nullSafe(municipality), nullSafe(province),
                nullSafe(region), nullSafe(postalCode), nullSafe(freeText), String.valueOf(limit));
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value.strip().toLowerCase(java.util.Locale.ROOT);
    }
}
