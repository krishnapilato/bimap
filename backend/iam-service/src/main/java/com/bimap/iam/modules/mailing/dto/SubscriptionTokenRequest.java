package com.bimap.iam.modules.mailing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/// The signed token carried by every link in a list email.
/// @author Khova Krishna Pilato
public record SubscriptionTokenRequest(@NotBlank @Size(max = 128) String token) {
}
