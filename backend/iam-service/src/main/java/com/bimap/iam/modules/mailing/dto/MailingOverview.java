package com.bimap.iam.modules.mailing.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/// Headline figures across every list.
///
/// @param uniqueSubscribers Distinct addresses subscribed to at least one list.
/// @param deliveries        Campaign messages attempted in the last thirty days.
/// @param growth            One point per day for the last thirty days, oldest first.
/// @author Khova Krishna Pilato
@Schema(description = "Mailing figures across every list")
public record MailingOverview(
        long activeLists,
        long archivedLists,
        AudienceCounts audience,
        long uniqueSubscribers,
        CampaignCounts campaigns,
        DeliveryCounts deliveries,
        List<GrowthPoint> growth) {
}
