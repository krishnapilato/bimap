package com.bimap.iam.modules.notification.dto;

import com.bimap.iam.modules.notification.domain.DeliveryStatus;
import com.bimap.iam.modules.notification.domain.MailFormat;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.List;

/// One row of the delivery log.
/// @author Khova Krishna Pilato
@Schema(description = "One message the platform tried to send")
public record SentEmailResponse(
        @Schema(example = "8f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f") String id,
        @Schema(example = "surveyor@bimap.local") String to,
        @Schema(example = "Confirm your BiMap account") String subject,
        @Schema(description = "The transactional template, or null for a message composed by hand",
                example = "ACCOUNT_ACTIVATION") String template,
        MailFormat format,
        DeliveryStatus status,
        String body,
        List<AttachmentSummary> attachments,
        @Schema(example = "Relay refused the recipient") String failureReason,
        Instant sentAt) {

    /// Filename and size. The bytes are never stored, so they are never returned.
    @Schema(description = "An attached file, described rather than carried")
    public record AttachmentSummary(
            @Schema(example = "registrations.csv") String filename,
            @Schema(example = "20480") long sizeBytes) {
    }
}
