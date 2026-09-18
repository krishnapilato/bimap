package com.bimap.iam.modules.mailing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/// @param reason Optional, and stored as given: it is the one honest signal of why people leave.
/// @author Khova Krishna Pilato
public record UnsubscribeRequest(@NotBlank @Size(max = 128) String token, @Size(max = 256) String reason) {

    public UnsubscribeRequest {
        reason = reason == null || reason.isBlank() ? null : reason.strip();
    }
}
