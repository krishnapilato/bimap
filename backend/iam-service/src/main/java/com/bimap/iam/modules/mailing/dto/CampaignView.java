package com.bimap.iam.modules.mailing.dto;

import com.bimap.iam.modules.mailing.domain.CampaignStatus;
import com.bimap.iam.modules.notification.domain.MailFormat;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/// One campaign, with where its delivery stands.
///
/// @param recipientCount Subscribers it was addressed to when sending began; zero before that.
/// @param deliveries     Outcomes read from the delivery log, so progress is visible mid-send.
/// @author Khova Krishna Pilato
@Schema(description = "A campaign and its delivery progress")
public record CampaignView(
        String id,
        String listId,
        String listName,
        String subject,
        String preheader,
        String body,
        MailFormat format,
        CampaignStatus status,
        Instant scheduledAt,
        Instant startedAt,
        Instant completedAt,
        int recipientCount,
        DeliveryCounts deliveries,
        String createdBy,
        Instant createdAt,
        Instant updatedAt) {
}
