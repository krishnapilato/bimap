package com.bimap.iam.modules.mailing.domain;

/// Where one address stands with one list.
/// @author Khova Krishna Pilato
public enum SubscriptionStatus {

    /// Added, waiting for the owner of the address to confirm it.
    PENDING,

    /// Confirmed, and the only state that receives campaigns.
    SUBSCRIBED,

    /// Opted out. Never mailed again unless the owner opts back in themselves.
    UNSUBSCRIBED;

    public boolean receivesCampaigns() {
        return this == SUBSCRIBED;
    }
}
