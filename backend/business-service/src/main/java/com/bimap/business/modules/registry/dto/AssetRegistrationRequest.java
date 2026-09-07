package com.bimap.business.modules.registry.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/// What the registration form submits.
///
/// The patterns here are the same ones the form schema hands to the client, so both ends agree
/// on what a valid ISTAT or cadastral code looks like.
///
/// @author Khova Krishna Pilato
public record AssetRegistrationRequest(

        @NotBlank @Size(max = 64) String region,
        @NotBlank @Size(max = 64) String provinceName,

        @NotBlank
        @Pattern(regexp = "[A-Za-z]{2}", message = "Province code must be two letters")
        String provinceCode,

        @NotBlank @Size(max = 96) String municipality,

        @NotBlank
        @Pattern(regexp = "[0-9]{6}", message = "ISTAT code must be exactly six digits")
        String istatCode,

        @Pattern(regexp = "^$|[A-Z][0-9]{3}", message = "Cadastral code must be a letter followed by three digits")
        String cadastralCode,

        @Pattern(regexp = "^$|[0-9]{5}", message = "Postal code must be five digits")
        String postalCode,

        @NotBlank @Size(max = 256) String address,
        @Size(max = 16) String houseNumber,
        @Size(max = 128) String locality,

        @DecimalMin(value = "-90.0") @DecimalMax(value = "90.0") BigDecimal latitude,
        @DecimalMin(value = "-180.0") @DecimalMax(value = "180.0") BigDecimal longitude,

        @NotBlank @Size(max = 256) String assetName,
        @Size(max = 64) String assetReference,
        @Size(max = 16) String entityBillingCode,
        @Size(max = 256) String entityName,

        @Size(max = 128) String ownership,
        @Size(max = 256) String protectionMeasure,
        @Size(max = 128) String constraintType,
        @Size(max = 128) String cadastralReference,
        @Size(max = 128) String transcription,
        @Size(max = 2000) String notes) {

    public AssetRegistrationRequest {
        provinceCode = provinceCode == null ? null : provinceCode.toUpperCase(java.util.Locale.ROOT);
        cadastralCode = cadastralCode == null ? null : cadastralCode.toUpperCase(java.util.Locale.ROOT);
    }
}
