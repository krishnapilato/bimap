package com.bimap.iam.modules.user.dto;

import com.bimap.iam.modules.user.domain.ApplicationRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/// Partial update. Null members are left untouched.
/// @author Khova Krishna Pilato
public record UpdateUserRequest(

        @Size(max = 80)
        String firstName,

        @Size(max = 80)
        String lastName,

        @Email @Size(max = 254)
        String email,

        ApplicationRole role,

        @Size(max = 16)
        String locale) {

    public UpdateUserRequest {
        firstName = firstName == null ? null : firstName.strip();
        lastName = lastName == null ? null : lastName.strip();
        email = email == null ? null : email.strip().toLowerCase(java.util.Locale.ROOT);
    }
}
