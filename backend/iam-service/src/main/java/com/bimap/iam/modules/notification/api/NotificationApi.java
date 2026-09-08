package com.bimap.iam.modules.notification.api;

import com.bimap.iam.modules.notification.domain.DeliveryStatus;
import com.bimap.iam.modules.notification.dto.SendEmailRequest;
import com.bimap.iam.modules.notification.dto.SentEmailResponse;
import com.bimap.platform.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

/// The documented contract for `/api/v1/notifications`.
/// @author Khova Krishna Pilato
@Tag(name = "Notifications", description = "The delivery log, and sending a message by hand")
@SecurityRequirement(name = "bearerAuth")
public interface NotificationApi {

    @Operation(summary = "The delivery log",
            description = """
                    Every message the platform tried to send, newest first — transactional mail as
                    well as anything composed by hand. Attachment bytes are never stored, so only
                    filenames and sizes come back.
                    """)
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Page of messages"),
            @ApiResponse(responseCode = "403", description = "Requires MANAGER or ADMINISTRATOR",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    PageResponse<SentEmailResponse> history(
            @Parameter(description = "Matches part of the recipient address", example = "bimap.local")
            @RequestParam(required = false) String recipient,

            @Parameter(description = "Only messages that ended this way")
            @RequestParam(required = false) DeliveryStatus status,

            @ParameterObject Pageable pageable);

    @Operation(summary = "One logged message",
            description = "Including the body as it was sent, so a delivery can be re-read rather than guessed at.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "The message"),
            @ApiResponse(responseCode = "404", description = "No such message",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    SentEmailResponse one(@Parameter(description = "Public id", example = "8f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f")
                          @PathVariable String id);

    @Operation(summary = "Send a message now",
            description = """
                    Sends immediately and returns the log row it produced, so the caller learns the
                    outcome rather than only that the request was accepted. There is no format field:
                    markup makes it `text/html`, prose makes it `text/plain`.
                    """)
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Recorded, with the outcome of the attempt"),
            @ApiResponse(responseCode = "400", description = "Malformed recipient, subject or body",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "403", description = "Requires ADMINISTRATOR",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    SentEmailResponse send(@Valid @RequestBody SendEmailRequest request);
}
