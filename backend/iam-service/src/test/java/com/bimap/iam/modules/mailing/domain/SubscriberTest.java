package com.bimap.iam.modules.mailing.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/// @author Khova Krishna Pilato
class SubscriberTest {

    private static Subscriber pending() {
        return Subscriber.builder()
                .email("giulia.rossi@example.com")
                .source(SubscriptionSource.SIGNUP_FORM)
                .build();
    }

    @Test
    @DisplayName("a new subscriber waits for confirmation and receives nothing")
    void startsPending() {
        var subscriber = pending();

        assertThat(subscriber.getStatus()).isEqualTo(SubscriptionStatus.PENDING);
        assertThat(subscriber.getStatus().receivesCampaigns()).isFalse();
    }

    @Test
    @DisplayName("confirming subscribes and clears an earlier opt-out")
    void confirmClearsOptOut() {
        var subscriber = pending();
        var then = Instant.parse("2026-09-01T10:00:00Z");
        subscriber.unsubscribe("Too many emails", then);

        subscriber.confirm(then.plusSeconds(60));

        assertThat(subscriber.getStatus()).isEqualTo(SubscriptionStatus.SUBSCRIBED);
        assertThat(subscriber.getSubscribedAt()).isEqualTo(then.plusSeconds(60));
        assertThat(subscriber.getUnsubscribedAt()).isNull();
        assertThat(subscriber.getUnsubscribeReason()).isNull();
    }

    @Test
    @DisplayName("unsubscribing twice keeps the first date and reason")
    void unsubscribeIsIdempotent() {
        var subscriber = pending();
        var first = Instant.parse("2026-09-01T10:00:00Z");

        subscriber.unsubscribe("Too many emails", first);
        subscriber.unsubscribe("One-click", first.plusSeconds(3600));

        assertThat(subscriber.getUnsubscribedAt()).isEqualTo(first);
        assertThat(subscriber.getUnsubscribeReason()).isEqualTo("Too many emails");
    }

    @Test
    @DisplayName("names are adopted only when they add something")
    void adoptsNamesSelectively() {
        var subscriber = pending();

        assertThat(subscriber.adoptNames("Giulia", null)).isTrue();
        assertThat(subscriber.adoptNames("Giulia", null)).isFalse();
        assertThat(subscriber.adoptNames(null, "Rossi")).isTrue();
        assertThat(subscriber.fullName()).isEqualTo("Giulia Rossi");
    }

    @Test
    @DisplayName("the confirmation cooldown runs from the last email sent")
    void honoursConfirmationCooldown() {
        var subscriber = pending();
        var sent = Instant.parse("2026-09-01T10:00:00Z");
        subscriber.setConfirmationSentAt(sent);

        assertThat(subscriber.confirmationSentWithin(Duration.ofMinutes(5), sent.plusSeconds(120))).isTrue();
        assertThat(subscriber.confirmationSentWithin(Duration.ofMinutes(5), sent.plusSeconds(301))).isFalse();
    }

    @Test
    @DisplayName("a campaign can be changed and started only before it sends")
    void campaignLifecycleRules() {
        assertThat(CampaignStatus.DRAFT.isEditable()).isTrue();
        assertThat(CampaignStatus.SCHEDULED.canStartSending()).isTrue();
        assertThat(CampaignStatus.SENDING.isEditable()).isFalse();
        assertThat(CampaignStatus.SENT.canStartSending()).isFalse();
        assertThat(CampaignStatus.CANCELLED.isFinished()).isTrue();
    }
}
