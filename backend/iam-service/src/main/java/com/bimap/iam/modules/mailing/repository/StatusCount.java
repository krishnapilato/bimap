package com.bimap.iam.modules.mailing.repository;

import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;

/// One row of a grouped subscriber count.
/// @author Khova Krishna Pilato
public record StatusCount(Long listId, SubscriptionStatus status, Long total) {
}
