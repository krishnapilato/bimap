package com.bimap.business.modules.registry.dto;

import com.bimap.business.modules.registry.domain.RegistrationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/// @author Khova Krishna Pilato
public record RegistrationStatusChange(@NotNull RegistrationStatus status, @Size(max = 512) String note) {
}
