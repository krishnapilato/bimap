package com.bimap.iam.modules.mailing.domain;

/// How an address arrived on a list, kept as part of the consent record.
/// @author Khova Krishna Pilato
public enum SubscriptionSource {

    /// Added one at a time by an administrator.
    ADMIN,

    /// Arrived in a bulk import.
    IMPORT,

    /// Signed up through the public subscription page.
    SIGNUP_FORM
}
