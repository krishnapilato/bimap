package com.bimap.iam.modules.mailing.service;

/// The delivery-log template names that mark a message as part of a campaign.
/// @author Khova Krishna Pilato
public final class CampaignMessages {

    /// A message sent to a subscriber, counted in the campaign's results.
    public static final String LIVE = "CAMPAIGN";

    /// A preview sent to an administrator, never counted.
    public static final String TEST = "CAMPAIGN_TEST";

    private CampaignMessages() {
    }
}
