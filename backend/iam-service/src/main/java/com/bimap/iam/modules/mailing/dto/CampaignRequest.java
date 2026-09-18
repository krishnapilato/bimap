package com.bimap.iam.modules.mailing.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/// A new campaign draft.
///
/// @param body Markup or prose, with optional merge tags such as `{{firstName}}`.
/// @author Khova Krishna Pilato
@Schema(description = "A new campaign draft")
public record CampaignRequest(

        @NotBlank @Size(max = 255)
        @Schema(example = "September survey notes") String subject,

        @Size(max = 255)
        @Schema(example = "Three new protected assets in Varese") String preheader,

        @NotBlank @Size(max = 200_000)
        @Schema(example = "<p>Hello {{firstName}},</p><p>This month in the registry.</p>") String body) {

    public CampaignRequest {
        subject = subject == null ? null : subject.strip();
        preheader = preheader == null || preheader.isBlank() ? null : preheader.strip();
    }
}
