package com.bimap.iam.modules.notification.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

/// An ad-hoc message, composed rather than triggered by an event.
///
/// There is no `format` field on purpose. Whether this is `text/html` or `text/plain` follows from
/// what the body actually contains, and asking the caller to declare it as well only creates a way
/// for the two to disagree.
///
/// @author Khova Krishna Pilato
@Schema(description = "A message to send now")
public record SendEmailRequest(
        @NotBlank @Email @Size(max = 320)
        @Schema(example = "surveyor@bimap.local") String to,

        @NotBlank @Size(max = 255)
        @Schema(example = "Registrations export") String subject,

        @NotBlank @Size(max = 100_000)
        @Schema(description = "Markup or prose. The content type is derived from it.",
                example = "<h1>Registrations export</h1>") String body,

        @Size(max = 10)
        @Schema(description = "Files to attach, base64-encoded") List<Attachment> attachments) {

    public SendEmailRequest {
        attachments = attachments == null ? List.of() : List.copyOf(attachments);
    }

    /// @author Khova Krishna Pilato
    @Schema(description = "One attached file")
    public record Attachment(
            @NotBlank @Size(max = 255) @Schema(example = "registrations.csv") String filename,
            @NotBlank @Size(max = 128) @Schema(example = "text/csv") String contentType,
            @NotBlank @Schema(description = "Base64 payload") String content) {
    }
}
