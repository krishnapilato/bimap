package com.bimap.business.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

/// Settings for the three public APIs this service reads from.
///
/// @param comuniIta      Italian administrative geography.
/// @param nominatim      OpenStreetMap address and postcode resolution.
/// @param codiceUnivoco  Italian public-body billing codes.
/// @param userAgent      Sent on every outbound call; Nominatim requires an identifiable one.
/// @author Khova Krishna Pilato
@ConfigurationProperties(prefix = "bimap.integration")
public record IntegrationProperties(

        @DefaultValue Upstream comuniIta,
        @DefaultValue Upstream nominatim,
        @DefaultValue Upstream codiceUnivoco,
        @DefaultValue("BiMap/2.0 (https://github.com/krishnapilato/bimap)") String userAgent) {

    /// @param baseUrl        Root of the upstream API.
    /// @param connectTimeout How long to wait for the connection.
    /// @param readTimeout    How long to wait for the response.
    /// @param cacheTtl       How long an answer stays reusable. Set to 0 to always call upstream.
    /// @author Khova Krishna Pilato
    public record Upstream(
            @DefaultValue("") String baseUrl,
            @DefaultValue("3s") Duration connectTimeout,
            @DefaultValue("10s") Duration readTimeout,
            @DefaultValue("24h") Duration cacheTtl) {

        public boolean cachingDisabled() {
            return cacheTtl.isZero() || cacheTtl.isNegative();
        }
    }
}
