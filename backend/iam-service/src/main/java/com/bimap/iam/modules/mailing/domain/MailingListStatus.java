package com.bimap.iam.modules.mailing.domain;

/// Whether a list is still part of day-to-day sending.
/// @author Khova Krishna Pilato
public enum MailingListStatus {

    /// Accepts subscribers and campaigns.
    ACTIVE,

    /// Kept for its history; nothing new is sent, but anyone on it can still opt out.
    ARCHIVED
}
