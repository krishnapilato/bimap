package com.bimap.iam.modules.mailing.dto;

import com.bimap.iam.modules.mailing.domain.MailingListStatus;
import jakarta.validation.constraints.NotNull;

/// @author Khova Krishna Pilato
public record MailingListStatusChange(@NotNull MailingListStatus status) {
}
