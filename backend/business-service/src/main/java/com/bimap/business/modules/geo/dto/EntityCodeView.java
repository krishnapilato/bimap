package com.bimap.business.modules.geo.dto;

/// A public body and the codes it is invoiced through.
///
/// @param billingCode Codice univoco used for electronic invoicing.
/// @param ipaCode     Index of Public Administrations identifier.
/// @author Khova Krishna Pilato
public record EntityCodeView(
        String name,
        String billingCode,
        String ipaCode,
        String taxCode,
        String category,
        String municipality,
        String province,
        String region,
        Integer offices,
        String reference) {
}
