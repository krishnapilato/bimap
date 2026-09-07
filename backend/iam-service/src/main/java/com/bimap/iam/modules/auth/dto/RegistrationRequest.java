package com.bimap.iam.modules.auth.dto;

import com.bimap.iam.modules.auth.validation.StrongPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/// @author Khova Krishna Pilato
public record RegistrationRequest(

        @NotBlank @Size(max = 80)
        String firstName,

        @NotBlank @Size(max = 80)
        String lastName,

        @NotBlank @Email @Size(max = 254)
        String email,

        @NotBlank @StrongPassword
        String password) {

    public RegistrationRequest {
        firstName = firstName == null ? null : firstName.strip();
        lastName = lastName == null ? null : lastName.strip();
        email = email == null ? null : email.strip().toLowerCase(java.util.Locale.ROOT);
    }
}
