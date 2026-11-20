package com.bimap.model;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonPropertyOrder({"id", "region", "province", "municipality", "address", "name", "istatCode", "latitude", "longitude", "number", "goodID"})
public record AssetFormRow(Long id, String region, String province, String municipality, String address, String name, String istatCode, double latitude, double longitude, int number, int goodID) {

    private static final String FORMULA_PREFIXES = "=+-@\t\r\n";

    public AssetFormRow forSpreadsheet() {
        return new AssetFormRow(id, cell(region), cell(province), cell(municipality), cell(address), cell(name), cell(istatCode), latitude, longitude, number, goodID);
    }

    private static String cell(String value) {
        return value != null && !value.isEmpty() && FORMULA_PREFIXES.indexOf(value.charAt(0)) >= 0 ? "'" + value : value;
    }
}
