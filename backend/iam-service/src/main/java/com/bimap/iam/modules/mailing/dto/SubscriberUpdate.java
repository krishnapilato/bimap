package com.bimap.iam.modules.mailing.dto;

import jakarta.validation.constraints.Size;

/// The parts of a subscriber an administrator may correct.
///
/// The address is the identity of the consent, so changing it means removing one subscriber and
/// adding another.
///
/// @author Khova Krishna Pilato
public record SubscriberUpdate(@Size(max = 80) String firstName, @Size(max = 80) String lastName) {

    public SubscriberUpdate {
        firstName = firstName == null ? null : firstName.strip();
        lastName = lastName == null ? null : lastName.strip();
    }
}
