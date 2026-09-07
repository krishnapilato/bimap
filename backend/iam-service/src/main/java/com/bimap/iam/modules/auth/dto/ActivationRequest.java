package com.bimap.iam.modules.auth.dto;

import jakarta.validation.constraints.NotBlank;

/// @author Khova Krishna Pilato
public record ActivationRequest(@NotBlank String token) {
}
