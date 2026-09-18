package com.bimap.iam.modules.mailing.dto;

import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/// Moves one subscriber by hand.
///
/// `SUBSCRIBED` asserts that consent was obtained elsewhere, `PENDING` sends a fresh confirmation
/// link, and `UNSUBSCRIBED` opts the address out on behalf of its owner.
///
/// @author Khova Krishna Pilato
public record SubscriberStatusChange(@NotNull SubscriptionStatus status, @Size(max = 256) String reason) {
}
