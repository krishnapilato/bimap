package com.bimap.iam.modules.mailing.dto;

import com.bimap.iam.modules.mailing.domain.MailingListStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/// One list, with the counts a list overview needs.
///
/// @param signupUrl  The public subscription page, present only while the list accepts sign-ups.
/// @param lastSentAt When the most recent campaign finished sending.
/// @author Khova Krishna Pilato
@Schema(description = "A mailing list and its audience")
public record MailingListView(
        String id,
        String name,
        String description,
        boolean doubleOptIn,
        boolean publicSignup,
        String signupUrl,
        MailingListStatus status,
        AudienceCounts audience,
        long campaignCount,
        Instant lastSentAt,
        String createdBy,
        Instant createdAt,
        Instant updatedAt) {
}
