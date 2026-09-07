package com.bimap.platform.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/// Token settings shared by both services.
/// @param secret                 HMAC signing key, at least 64 characters for HS512.
/// @param issuer                 Value of the `iss` claim, verified on every parse.
/// @param accessTokenTtl         How long an access token stays valid.
/// @param refreshTokenTtl        How long a refresh token stays valid.
/// @param activationTokenTtl     Lifetime of the link in an activation email.
/// @param passwordResetTokenTtl  Lifetime of the link in a password-reset email.
/// @param clockSkew              Tolerance for clock drift between services.
/// @author Khova Krishna Pilato
@Validated
@ConfigurationProperties(prefix = "bimap.security.jwt")
public record JwtProperties(

        @NotBlank
        @Size(min = 64, message = "bimap.security.jwt.secret must be at least 64 characters (HS512)")
        String secret,

        @DefaultValue("bimap")
        String issuer,

        @DefaultValue("15m")
        Duration accessTokenTtl,

        @DefaultValue("30d")
        Duration refreshTokenTtl,

        @DefaultValue("48h")
        Duration activationTokenTtl,

        @DefaultValue("1h")
        Duration passwordResetTokenTtl,

        @DefaultValue("30s")
        Duration clockSkew) {

    /// Lifetime to stamp on a freshly issued token of the given type.
    public Duration ttlFor(TokenType type) {
        return switch (type) {
            case ACCESS -> accessTokenTtl;
            case REFRESH -> refreshTokenTtl;
            case ACTIVATION -> activationTokenTtl;
            case PASSWORD_RESET -> passwordResetTokenTtl;
        };
    }
}
