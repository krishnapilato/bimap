package com.bimap.iam.modules.mailing.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/// Partial update of a draft or scheduled campaign. Null members are left untouched.
/// @author Khova Krishna Pilato
public record CampaignUpdate(

        @Size(max = 255) @Pattern(regexp = ".*\\S.*", message = "must not be blank")
        String subject,

        @Size(max = 255)
        String preheader,

        @Size(max = 200_000) @Pattern(regexp = "(?s).*\\S.*", message = "must not be blank")
        String body) {

    public CampaignUpdate {
        subject = subject == null ? null : subject.strip();
        preheader = preheader == null ? null : preheader.strip();
    }
}
