package com.bimap.iam.modules.mailing.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

/// @author Khova Krishna Pilato
public record CampaignSchedule(@NotNull @Future Instant sendAt) {
}
