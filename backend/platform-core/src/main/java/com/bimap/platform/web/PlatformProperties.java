package com.bimap.platform.web;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.util.List;

/// Identity and presentation of one service, used by the landing page and the OpenAPI document.
///
/// @param serviceName   Human name shown on the landing page, e.g. "IAM Service".
/// @param tagline       One line describing what this service owns.
/// @param appUrl        Where the operator can reach the front end.
/// @param repositoryUrl Source repository link shown on the landing page.
/// @param corsOrigins   Exact origins allowed to call this service from a browser.
/// @param attributions  Third-party data sources this service reads from, credited on the
///                      landing page and in the OpenAPI description. Empty for a service that
///                      calls nobody.
/// @author Khova Krishna Pilato
@ConfigurationProperties(prefix = "bimap.platform")
public record PlatformProperties(

        @DefaultValue("BiMap Service") String serviceName,
        @DefaultValue("BiMap backend service") String tagline,
        @DefaultValue("http://localhost:4200") String appUrl,
        @DefaultValue("https://github.com/krishnapilato/bimap") String repositoryUrl,
        @DefaultValue({"http://localhost:4200"}) List<String> corsOrigins,
        List<Attribution> attributions,
        List<Peer> peers) {

    public PlatformProperties {
        corsOrigins = corsOrigins == null ? List.of() : List.copyOf(corsOrigins);
        attributions = attributions == null ? List.of() : List.copyOf(attributions);
        peers = peers == null ? List.of() : List.copyOf(peers);
    }

    /// Another service in the platform, linked from this one so an operator landing on either
    /// can find the rest of the API without knowing the port by heart.
    ///
    /// @param name  Display name, e.g. "Business Core".
    /// @param url   Root of that service.
    /// @param owns  What it is responsible for, in one short phrase.
    /// @author Khova Krishna Pilato
    public record Peer(String name, String url, String owns) {

        public String docsUrl() {
            return (url.endsWith("/") ? url.substring(0, url.length() - 1) : url) + "/swagger-ui.html";
        }
    }

    public boolean hasPeers() {
        return !peers.isEmpty();
    }

    /// One credited data source.
    ///
    /// @param name    Display name, e.g. "Comuni-ITA".
    /// @param url     Where to find it.
    /// @param provides What we take from it, in one short phrase.
    /// @param licence  Licence or terms line, when the source asks to be credited under one.
    /// @author Khova Krishna Pilato
    public record Attribution(String name, String url, String provides, String licence) {
    }

    public boolean hasAttributions() {
        return !attributions.isEmpty();
    }
}
