package com.bimap.iam.modules.mailing.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/// One address added by an administrator.
/// @author Khova Krishna Pilato
@Schema(description = "An address to add to a list")
public record SubscriberRequest(

        @NotBlank @Email @Size(max = 254)
        @Schema(example = "giulia.rossi@example.com") String email,

        @Size(max = 80) @Schema(example = "Giulia") String firstName,

        @Size(max = 80) @Schema(example = "Rossi") String lastName,

        @NotNull ConsentMode consent) {

    public SubscriberRequest {
        email = email == null ? null : email.strip().toLowerCase(java.util.Locale.ROOT);
        firstName = blankToNull(firstName);
        lastName = blankToNull(lastName);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
