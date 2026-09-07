package com.bimap.iam.modules.auth.dto;

import com.bimap.iam.modules.auth.validation.StrongPassword;
import jakarta.validation.constraints.NotBlank;

/// @author Khova Krishna Pilato
public record ResetPasswordRequest(

        @NotBlank
        String token,

        @NotBlank @StrongPassword
        String newPassword) {
}
