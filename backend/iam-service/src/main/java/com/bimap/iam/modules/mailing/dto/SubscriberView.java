package com.bimap.iam.modules.mailing.dto;

import com.bimap.iam.modules.mailing.domain.SubscriptionSource;
import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;

import java.time.Instant;

/// One subscriber and their consent record.
/// @author Khova Krishna Pilato
public record SubscriberView(
        String id,
        String listId,
        String email,
        String firstName,
        String lastName,
        String fullName,
        SubscriptionStatus status,
        SubscriptionSource source,
        Instant subscribedAt,
        Instant unsubscribedAt,
        String unsubscribeReason,
        Instant confirmationSentAt,
        Instant createdAt,
        Instant updatedAt) {
}
