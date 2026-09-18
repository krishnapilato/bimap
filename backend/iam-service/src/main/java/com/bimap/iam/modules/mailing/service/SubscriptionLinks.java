package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.MailingList;
import com.bimap.iam.modules.mailing.domain.Subscriber;
import com.bimap.iam.modules.notification.service.MailProperties;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Optional;

/// Signs the links in list emails, so a subscriber can confirm or leave without an account.
///
/// A token is the subscriber's public id plus an HMAC of it, which makes it stateless and
/// unforgeable without the key. It deliberately does not expire: an unsubscribe link has to keep
/// working in a message someone reads a year later, and confirming twice changes nothing.
///
/// @author Khova Krishna Pilato
@Component
public class SubscriptionLinks {

    private static final String ALGORITHM = "HmacSHA256";

    /// Domain separation, so a signature made here can never be replayed as anything else.
    private static final String CONTEXT = "bimap:subscription-link:v1:";

    private final SecretKeySpec key;
    private final String appBaseUrl;
    private final String publicApiUrl;

    public SubscriptionLinks(MailingProperties mailing, MailProperties mail) {
        this.key = new SecretKeySpec(mailing.linkSecret().getBytes(StandardCharsets.UTF_8), ALGORITHM);
        this.appBaseUrl = trim(mail.appBaseUrl());
        this.publicApiUrl = mailing.trimmedPublicApiUrl();
    }

    public String tokenFor(Subscriber subscriber) {
        var id = subscriber.getPublicId();
        return id + "." + signature(id);
    }

    /// The subscriber a token was issued for, when its signature holds.
    public Optional<String> subscriberIdOf(String token) {
        if (token == null) {
            return Optional.empty();
        }
        var separator = token.lastIndexOf('.');
        if (separator <= 0 || separator == token.length() - 1) {
            return Optional.empty();
        }

        var subscriberId = token.substring(0, separator);
        var presented = token.substring(separator + 1).getBytes(StandardCharsets.US_ASCII);
        var expected = signature(subscriberId).getBytes(StandardCharsets.US_ASCII);

        return MessageDigest.isEqual(expected, presented) ? Optional.of(subscriberId) : Optional.empty();
    }

    public String confirmUrl(Subscriber subscriber) {
        return "%s/subscriptions/confirm?token=%s".formatted(appBaseUrl, encoded(tokenFor(subscriber)));
    }

    public String manageUrl(Subscriber subscriber) {
        return "%s/subscriptions/manage?token=%s".formatted(appBaseUrl, encoded(tokenFor(subscriber)));
    }

    /// The RFC 8058 target an inbox posts to when its own unsubscribe button is pressed.
    public String oneClickUrl(Subscriber subscriber) {
        return "%s/api/v1/subscriptions/one-click?token=%s".formatted(publicApiUrl, encoded(tokenFor(subscriber)));
    }

    public String signupUrl(MailingList list) {
        return "%s/subscribe/%s".formatted(appBaseUrl, list.getPublicId());
    }

    private String signature(String subscriberId) {
        try {
            var mac = Mac.getInstance(ALGORITHM);
            mac.init(key);
            var digest = mac.doFinal((CONTEXT + subscriberId).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (GeneralSecurityException impossible) {
            throw new IllegalStateException("HmacSHA256 is unavailable on this JVM", impossible);
        }
    }

    private static String encoded(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String trim(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
