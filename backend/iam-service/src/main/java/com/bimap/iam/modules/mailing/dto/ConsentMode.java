package com.bimap.iam.modules.mailing.dto;

/// Whether an administrator already holds consent for an address, or has to ask for it.
/// @author Khova Krishna Pilato
public enum ConsentMode {

    /// Consent was obtained elsewhere; the address is subscribed straight away.
    CONFIRMED,

    /// The address receives a confirmation link and stays pending until it is followed.
    REQUEST_CONFIRMATION
}
