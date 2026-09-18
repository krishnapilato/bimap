package com.bimap.iam.modules.mailing.service;

import com.bimap.iam.modules.mailing.domain.MailingList;
import com.bimap.iam.modules.mailing.domain.Subscriber;
import com.bimap.iam.modules.notification.service.MailProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/// @author Khova Krishna Pilato
class SubscriptionLinksTest {

    private static final String SECRET = "a-signing-key-for-subscription-links-in-tests-only";

    private final SubscriptionLinks links = linksWith(SECRET);

    private static SubscriptionLinks linksWith(String secret) {
        return new SubscriptionLinks(
                new MailingProperties(secret, "https://api.example.com/", Duration.ZERO, Duration.ofMinutes(5), 5000),
                new MailProperties("no-reply@example.com", "BiMap", null, "https://app.example.com/", true));
    }

    private static Subscriber subscriber(String publicId) {
        return Subscriber.builder().publicId(publicId).email("giulia.rossi@example.com").build();
    }

    @Test
    @DisplayName("a token issued for a subscriber resolves back to that subscriber")
    void roundTrips() {
        var token = links.tokenFor(subscriber("0b6f4c3e-8d1a-4c6b-9e21-7f3a5d2c1b90"));

        assertThat(links.subscriberIdOf(token)).contains("0b6f4c3e-8d1a-4c6b-9e21-7f3a5d2c1b90");
    }

    @Test
    @DisplayName("a token whose signature was altered is refused")
    void refusesTamperedSignature() {
        var token = links.tokenFor(subscriber("0b6f4c3e-8d1a-4c6b-9e21-7f3a5d2c1b90"));
        var tampered = token.substring(0, token.length() - 1) + (token.endsWith("A") ? "B" : "A");

        assertThat(links.subscriberIdOf(tampered)).isEmpty();
    }

    @Test
    @DisplayName("a signature cannot be moved onto another subscriber's id")
    void refusesSignatureReuseAcrossSubscribers() {
        var token = links.tokenFor(subscriber("0b6f4c3e-8d1a-4c6b-9e21-7f3a5d2c1b90"));
        var signature = token.substring(token.lastIndexOf('.'));

        assertThat(links.subscriberIdOf("5a2e9d71-3c4b-4f8a-b6d2-19e8c7a40f35" + signature)).isEmpty();
    }

    @Test
    @DisplayName("a token signed with another key is refused")
    void refusesForeignKey() {
        var foreign = linksWith("a-completely-different-key-that-is-also-long-enough")
                .tokenFor(subscriber("0b6f4c3e-8d1a-4c6b-9e21-7f3a5d2c1b90"));

        assertThat(links.subscriberIdOf(foreign)).isEmpty();
    }

    @ParameterizedTest(name = "refuses [{0}]")
    @NullAndEmptySource
    @ValueSource(strings = {".", "no-separator", "id-only.", ".signature-only"})
    @DisplayName("malformed tokens are refused without throwing")
    void refusesMalformedTokens(String token) {
        assertThat(links.subscriberIdOf(token)).isEmpty();
    }

    @Test
    @DisplayName("links point at the client for people and at the API for mail clients")
    void buildsLinksAgainstTheRightHosts() {
        var subscriber = subscriber("0b6f4c3e-8d1a-4c6b-9e21-7f3a5d2c1b90");
        var list = MailingList.builder().publicId("list-1").name("Bulletin").build();

        assertThat(links.confirmUrl(subscriber)).startsWith("https://app.example.com/subscriptions/confirm?token=");
        assertThat(links.manageUrl(subscriber)).startsWith("https://app.example.com/subscriptions/manage?token=");
        assertThat(links.oneClickUrl(subscriber)).startsWith("https://api.example.com/api/v1/subscriptions/one-click?token=");
        assertThat(links.signupUrl(list)).isEqualTo("https://app.example.com/subscribe/list-1");
    }
}
