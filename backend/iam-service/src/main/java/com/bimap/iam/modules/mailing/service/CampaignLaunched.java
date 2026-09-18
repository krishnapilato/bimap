package com.bimap.iam.modules.mailing.service;

/// A campaign was claimed for sending; delivery starts once that claim has committed.
/// @author Khova Krishna Pilato
public record CampaignLaunched(Long campaignId) {
}
