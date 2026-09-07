package com.bimap.iam.modules.user.dto;

import com.bimap.iam.modules.auth.validation.StrongPassword;
import com.bimap.iam.modules.user.domain.ApplicationRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/// Administrator-driven creation. Leaving the password empty sends an activation invitation.
/// @author Khova Krishna Pilato
public record CreateUserRequest(

        @NotBlank @Size(max = 80)
        String firstName,

        @NotBlank @Size(max = 80)
        String lastName,

        @NotBlank @Email @Size(max = 254)
        String email,

        @StrongPassword
        String password,

        @NotNull
        ApplicationRole role) {

    public CreateUserRequest {
        firstName = firstName == null ? null : firstName.strip();
        lastName = lastName == null ? null : lastName.strip();
        email = email == null ? null : email.strip().toLowerCase(java.util.Locale.ROOT);
    }
}
