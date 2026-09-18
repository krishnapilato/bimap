package com.bimap.iam.modules.mailing.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/// Partial update of a list. Null members are left untouched.
/// @author Khova Krishna Pilato
public record MailingListUpdate(

        @Size(max = 120) @Pattern(regexp = ".*\\S.*", message = "must not be blank")
        String name,

        @Size(max = 500)
        String description,

        Boolean doubleOptIn,

        Boolean publicSignup) {

    public MailingListUpdate {
        name = name == null ? null : name.strip();
        description = description == null ? null : description.strip();
    }
}
