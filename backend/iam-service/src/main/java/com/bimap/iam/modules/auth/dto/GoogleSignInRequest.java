package com.bimap.iam.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

/// The ID token issued to the browser by Google Identity Services.
/// @author Khova Krishna Pilato
public record GoogleSignInRequest(@NotBlank String idToken) {
}
