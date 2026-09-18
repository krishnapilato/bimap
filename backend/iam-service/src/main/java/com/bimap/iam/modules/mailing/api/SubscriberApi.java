package com.bimap.iam.modules.mailing.api;

import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;
import com.bimap.iam.modules.mailing.dto.SubscriberImportReport;
import com.bimap.iam.modules.mailing.dto.SubscriberImportRequest;
import com.bimap.iam.modules.mailing.dto.SubscriberRequest;
import com.bimap.iam.modules.mailing.dto.SubscriberStatusChange;
import com.bimap.iam.modules.mailing.dto.SubscriberUpdate;
import com.bimap.iam.modules.mailing.dto.SubscriberView;
import com.bimap.platform.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

/// The documented contract for `/api/v1/mailing-lists/{listId}/subscribers`.
/// @author Khova Krishna Pilato
@Tag(name = "Subscribers", description = "The people on a list, their consent, imports and exports")
@SecurityRequirement(name = "bearerAuth")
public interface SubscriberApi {

    @Operation(summary = "Search subscribers", description = "Free text over address and name, optionally by status.")
    @ApiResponse(responseCode = "200", description = "Page of subscribers")
    PageResponse<SubscriberView> search(
            @PathVariable String listId,
            @Parameter(description = "Matches address, first or last name", example = "rossi")
            @RequestParam(required = false) String q,
            @RequestParam(required = false) SubscriptionStatus status,
            @ParameterObject Pageable pageable);

    @Operation(summary = "Read one subscriber")
    @ApiResponse(responseCode = "200", description = "Subscriber returned")
    SubscriberView findOne(@PathVariable String listId, @PathVariable String subscriberId);

    @Operation(summary = "Add one address",
            description = "`CONFIRMED` subscribes straight away; `REQUEST_CONFIRMATION` emails a link first.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Subscriber added"),
            @ApiResponse(responseCode = "409", description = "The address is already on the list; `subscriberId` says where",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "422", description = "The list is archived",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    ResponseEntity<SubscriberView> add(@PathVariable String listId, @Valid @RequestBody SubscriberRequest request);

    @Operation(summary = "Import addresses in bulk",
            description = """
                    Each row is validated on its own and rejected rows are reported, so one bad
                    address never fails the batch. Addresses already on the list keep their status:
                    an import cannot resubscribe someone who opted out.
                    """)
    @ApiResponse(responseCode = "200", description = "Import report")
    SubscriberImportReport importRows(@PathVariable String listId, @Valid @RequestBody SubscriberImportRequest request);

    @Operation(summary = "Export subscribers as CSV", description = "Includes each consent record.")
    @ApiResponse(responseCode = "200", description = "CSV stream", content = @Content(mediaType = "text/csv"))
    void exportCsv(@PathVariable String listId,
                   @RequestParam(required = false) SubscriptionStatus status,
                   HttpServletResponse response);

    @Operation(summary = "Correct a subscriber's name")
    @ApiResponse(responseCode = "200", description = "Subscriber updated")
    SubscriberView update(@PathVariable String listId, @PathVariable String subscriberId,
                          @Valid @RequestBody SubscriberUpdate update);

    @Operation(summary = "Change a subscription by hand",
            description = "`SUBSCRIBED` asserts consent, `PENDING` asks again, `UNSUBSCRIBED` opts the address out.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status applied"),
            @ApiResponse(responseCode = "422", description = "Archived list, or a confirmation was sent too recently",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    SubscriberView changeStatus(@PathVariable String listId, @PathVariable String subscriberId,
                                @Valid @RequestBody SubscriberStatusChange change);

    @Operation(summary = "Send the confirmation link again", description = "Only for a pending address.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Confirmation queued"),
            @ApiResponse(responseCode = "422", description = "Not pending, or asked too recently",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    ResponseEntity<Void> resendConfirmation(@PathVariable String listId, @PathVariable String subscriberId);

    @Operation(summary = "Erase a subscriber", description = "Removes the address and its consent record.")
    @ApiResponse(responseCode = "204", description = "Subscriber erased")
    ResponseEntity<Void> remove(@PathVariable String listId, @PathVariable String subscriberId);
}
