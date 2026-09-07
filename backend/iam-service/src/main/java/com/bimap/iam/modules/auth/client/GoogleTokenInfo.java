package com.bimap.iam.modules.auth.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.Set;

/// Google response for a verified ID token.
/// @author Khova Krishna Pilato
@JsonIgnoreProperties(ignoreUnknown = true)
public record GoogleTokenInfo(
        String iss,
        String aud,
        String sub,
        String email,
        @JsonProperty("email_verified") String emailVerified,
        String name,
        @JsonProperty("given_name") String givenName,
        @JsonProperty("family_name") String familyName,
        String picture,
        String locale,
        String exp) {

    private static final Set<String> TRUSTED_ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    public boolean issuedByGoogle() {
        return iss != null && TRUSTED_ISSUERS.contains(iss);
    }

    public boolean addressedTo(String clientId) {
        return aud != null && aud.equals(clientId);
    }

    public boolean emailIsVerified() {
        return "true".equalsIgnoreCase(emailVerified);
    }

    public boolean expired(Instant now) {
        try {
            return Instant.ofEpochSecond(Long.parseLong(exp)).isBefore(now);
        } catch (NumberFormatException malformed) {
            return true;
        }
    }

    public String firstNameOrFallback() {
        if (givenName != null && !givenName.isBlank()) {
            return givenName;
        }
        return name != null && !name.isBlank() ? name.split(" ")[0] : email.split("@")[0];
    }

    public String lastNameOrFallback() {
        if (familyName != null && !familyName.isBlank()) {
            return familyName;
        }
        var parts = name == null ? new String[0] : name.strip().split(" ");
        return parts.length > 1 ? parts[parts.length - 1] : "-";
    }
}
