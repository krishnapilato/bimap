package com.bimap.iam.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

/// @param maxFailedLoginAttempts  Bad passwords tolerated before the account locks itself.
/// @param lockoutDuration         How long that lock lasts.
/// @param selfRegistrationEnabled Whether the public sign-up endpoint accepts new accounts.
/// @param googleClientId          OAuth2 client id every Google ID token must be addressed to.
/// @param staleActivationAfter    Age at which an un-activated account is swept away.
/// @author Khova Krishna Pilato
@ConfigurationProperties(prefix = "bimap.auth")
public record AuthProperties(

        @DefaultValue("5") int maxFailedLoginAttempts,
        @DefaultValue("15m") Duration lockoutDuration,
        @DefaultValue("true") boolean selfRegistrationEnabled,
        String googleClientId,
        @DefaultValue("7d") Duration staleActivationAfter) {

    public boolean googleSignInConfigured() {
        return googleClientId != null && !googleClientId.isBlank();
    }
}
