package com.bimap.iam.modules.mailing.service;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

/// Settings for mailing lists and campaigns.
///
/// @param linkSecret           Key the subscription links are signed with. Rotating it invalidates
///                             every confirm and unsubscribe link already delivered.
/// @param publicApiUrl         Root of this service as an inbox reaches it, for the one-click
///                             unsubscribe header.
/// @param sendInterval         Pause between two campaign messages, to stay inside relay limits.
/// @param confirmationCooldown Minimum gap between two confirmation emails to the same address.
/// @param maxImportRows        Largest batch one import may carry.
/// @author Khova Krishna Pilato
@Validated
@ConfigurationProperties(prefix = "bimap.mailing")
public record MailingProperties(

        @NotBlank @Size(min = 32, message = "bimap.mailing.link-secret must be at least 32 characters")
        String linkSecret,

        @DefaultValue("http://localhost:9843") String publicApiUrl,
        @DefaultValue("150ms") Duration sendInterval,
        @DefaultValue("5m") Duration confirmationCooldown,
        @DefaultValue("5000") int maxImportRows) {

    public String trimmedPublicApiUrl() {
        return publicApiUrl.endsWith("/") ? publicApiUrl.substring(0, publicApiUrl.length() - 1) : publicApiUrl;
    }
}
