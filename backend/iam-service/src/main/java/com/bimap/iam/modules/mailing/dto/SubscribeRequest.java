package com.bimap.iam.modules.mailing.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/// A sign-up from the public subscription page.
/// @author Khova Krishna Pilato
@Schema(description = "A public sign-up")
public record SubscribeRequest(

        @NotBlank @Size(max = 36) String listId,

        @NotBlank @Email @Size(max = 254)
        @Schema(example = "giulia.rossi@example.com") String email,

        @Size(max = 80) String firstName,

        @Size(max = 80) String lastName) {

    public SubscribeRequest {
        email = email == null ? null : email.strip().toLowerCase(java.util.Locale.ROOT);
        firstName = firstName == null || firstName.isBlank() ? null : firstName.strip();
        lastName = lastName == null || lastName.isBlank() ? null : lastName.strip();
    }
}
