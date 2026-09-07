package com.bimap.business.modules.registry.dto;

import com.bimap.business.modules.registry.domain.RegistrationStatus;

import java.math.BigDecimal;
import java.time.Instant;

/// One registration as the table and the detail view read it.
/// @author Khova Krishna Pilato
public record AssetRegistrationView(
        String id,
        String region,
        String provinceName,
        String provinceCode,
        String municipality,
        String istatCode,
        String cadastralCode,
        String postalCode,
        String address,
        String houseNumber,
        String fullAddress,
        String locality,
        BigDecimal latitude,
        BigDecimal longitude,
        String assetName,
        String assetReference,
        String entityBillingCode,
        String entityName,
        String ownership,
        String protectionMeasure,
        String constraintType,
        String cadastralReference,
        String transcription,
        String notes,
        RegistrationStatus status,
        String reviewNote,
        Instant submittedAt,
        Instant reviewedAt,
        String reviewedBy,
        String createdBy,
        Instant createdAt,
        Instant updatedAt) {
}
