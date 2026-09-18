package com.bimap.iam.modules.mailing.dto;

/// How many campaigns sit in each stage.
/// @author Khova Krishna Pilato
public record CampaignCounts(long drafts, long scheduled, long sending, long sent, long cancelled) {
}
