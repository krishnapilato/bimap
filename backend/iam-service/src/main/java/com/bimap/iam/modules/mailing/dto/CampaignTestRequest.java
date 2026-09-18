package com.bimap.iam.modules.mailing.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/// Where to send a preview of a campaign.
/// @author Khova Krishna Pilato
public record CampaignTestRequest(@NotBlank @Email @Size(max = 320) String to) {

    public CampaignTestRequest {
        to = to == null ? null : to.strip();
    }
}
