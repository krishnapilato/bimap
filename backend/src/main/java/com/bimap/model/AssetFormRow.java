package com.bimap.model;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonPropertyOrder({"id", "region", "province", "municipality", "address", "name", "istatCode", "latitude", "longitude"})
public record AssetFormRow(Long id, String region, String province, String municipality, String address, String name, String istatCode, double latitude, double longitude) {

    private static final String FORMULA_PREFIXES = "=+-@\t\r";

    public AssetFormRow forSpreadsheet() {
        return new AssetFormRow(id, cell(region), cell(province), cell(municipality), cell(address), cell(name), istatCode, latitude, longitude);
    }

    private static String cell(String value) {
        return value != null && !value.isEmpty() && FORMULA_PREFIXES.indexOf(value.charAt(0)) >= 0 ? "'" + value : value;
    }
}
