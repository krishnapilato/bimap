package com.bimap.iam.modules.mailing.dto;

import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;

import java.time.Instant;

/// A subscription as its owner sees it on the preferences page.
///
/// @param listActive False once the list is archived: opting out still works, joining does not.
/// @author Khova Krishna Pilato
public record SubscriptionView(
        String listId,
        String listName,
        String listDescription,
        boolean listActive,
        String email,
        String firstName,
        SubscriptionStatus status,
        Instant subscribedAt,
        Instant unsubscribedAt) {
}
