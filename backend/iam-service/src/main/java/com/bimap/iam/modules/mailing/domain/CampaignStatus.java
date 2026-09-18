package com.bimap.iam.modules.mailing.domain;

/// How far a campaign has got from a draft to an inbox.
/// @author Khova Krishna Pilato
public enum CampaignStatus {

    /// Being written.
    DRAFT,

    /// Written, and waiting for its send time.
    SCHEDULED,

    /// Going out now, one recipient at a time.
    SENDING,

    /// Every recipient has been attempted.
    SENT,

    /// Stopped while sending; whoever had not been reached yet never will be.
    CANCELLED;

    public boolean isEditable() {
        return this == DRAFT || this == SCHEDULED;
    }

    public boolean canStartSending() {
        return this == DRAFT || this == SCHEDULED;
    }

    public boolean isFinished() {
        return this == SENT || this == CANCELLED;
    }
}
