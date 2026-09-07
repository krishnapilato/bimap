package com.bimap.iam.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/// @author Khova Krishna Pilato
public record ForgotPasswordRequest(@NotBlank @Email String email) {

    public ForgotPasswordRequest {
        email = email == null ? null : email.strip().toLowerCase(java.util.Locale.ROOT);
    }
}
