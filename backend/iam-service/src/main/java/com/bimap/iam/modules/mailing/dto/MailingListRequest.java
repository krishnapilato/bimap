package com.bimap.iam.modules.mailing.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/// A new list.
///
/// @param doubleOptIn  Defaults to true: new addresses confirm themselves before receiving anything.
/// @param publicSignup Defaults to false: nobody can join through the public page until it is opened.
/// @author Khova Krishna Pilato
@Schema(description = "A new mailing list")
public record MailingListRequest(

        @NotBlank @Size(max = 120)
        @Schema(example = "Heritage survey bulletin") String name,

        @Size(max = 500)
        @Schema(example = "Monthly notes for the surveyors working on the Lombardy registry") String description,

        Boolean doubleOptIn,

        Boolean publicSignup) {

    public MailingListRequest {
        name = name == null ? null : name.strip();
        description = description == null || description.isBlank() ? null : description.strip();
    }

    public boolean doubleOptInOrDefault() {
        return doubleOptIn == null || doubleOptIn;
    }

    public boolean publicSignupOrDefault() {
        return publicSignup != null && publicSignup;
    }
}
