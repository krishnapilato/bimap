package com.bimap.iam.modules.user.dto;

import com.bimap.iam.modules.user.domain.AccountStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/// @author Khova Krishna Pilato
public record AccountStatusChange(

        @NotNull
        AccountStatus status,

        @Size(max = 256)
        String reason) {
}
