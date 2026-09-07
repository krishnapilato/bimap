package com.bimap.iam.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/// @author Khova Krishna Pilato
public record LoginRequest(

        @NotBlank @Email @Size(max = 254)
        String email,

        @NotBlank @Size(max = 128)
        String password) {

    public LoginRequest {
        email = email == null ? null : email.strip().toLowerCase(java.util.Locale.ROOT);
    }
}
