package com.bimap.iam.modules.notification.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/// @param from        Envelope sender address.
/// @param fromName    Display name shown in the recipient inbox.
/// @param replyTo     Where replies should go, when it differs from the sender.
/// @param appBaseUrl  Root of the web client, used to build activation and reset links.
/// @param enabled     Set false to log messages instead of sending them.
/// @author Khova Krishna Pilato
@ConfigurationProperties(prefix = "bimap.mail")
public record MailProperties(

        @DefaultValue("no-reply@bimap.local") String from,
        @DefaultValue("BiMap") String fromName,
        String replyTo,
        @DefaultValue("http://localhost:4200") String appBaseUrl,
        @DefaultValue("true") boolean enabled) {

    public String activationLink(String token) {
        return "%s/auth/activate?token=%s".formatted(trimmedBaseUrl(), token);
    }

    public String passwordResetLink(String token) {
        return "%s/auth/reset-password?token=%s".formatted(trimmedBaseUrl(), token);
    }

    private String trimmedBaseUrl() {
        return appBaseUrl.endsWith("/") ? appBaseUrl.substring(0, appBaseUrl.length() - 1) : appBaseUrl;
    }
}
