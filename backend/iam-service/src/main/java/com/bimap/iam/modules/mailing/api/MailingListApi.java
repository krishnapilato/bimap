package com.bimap.iam.modules.mailing.api;

import com.bimap.iam.modules.mailing.domain.MailingListStatus;
import com.bimap.iam.modules.mailing.dto.GrowthPoint;
import com.bimap.iam.modules.mailing.dto.MailingListRequest;
import com.bimap.iam.modules.mailing.dto.MailingListStatusChange;
import com.bimap.iam.modules.mailing.dto.MailingListUpdate;
import com.bimap.iam.modules.mailing.dto.MailingListView;
import com.bimap.iam.modules.mailing.dto.MailingOverview;
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
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

/// The documented contract for `/api/v1/mailing-lists`.
/// @author Khova Krishna Pilato
@Tag(name = "Mailing lists", description = "Audiences people subscribe to, and their headline figures")
@SecurityRequirement(name = "bearerAuth")
public interface MailingListApi {

    @Operation(summary = "Figures across every list",
            description = "Audience by status, campaigns by stage, deliveries and daily growth over thirty days.")
    @ApiResponse(responseCode = "200", description = "Overview returned")
    MailingOverview overview();

    @Operation(summary = "Search lists", description = "Free text over name and description, optionally by status.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Page of lists"),
            @ApiResponse(responseCode = "403", description = "Requires mailing:read",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    PageResponse<MailingListView> search(
            @Parameter(description = "Matches name or description", example = "bulletin")
            @RequestParam(required = false) String q,
            @RequestParam(required = false) MailingListStatus status,
            @ParameterObject Pageable pageable);

    @Operation(summary = "Read one list")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List returned"),
            @ApiResponse(responseCode = "404", description = "No such list",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    MailingListView findOne(@PathVariable String listId);

    @Operation(summary = "Create a list", description = "Double opt-in is on and public sign-up off unless said otherwise.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "List created"),
            @ApiResponse(responseCode = "409", description = "A list with that name exists",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    ResponseEntity<MailingListView> create(@Valid @RequestBody MailingListRequest request);

    @Operation(summary = "Update a list", description = "Only the members present in the body are applied.")
    @ApiResponse(responseCode = "200", description = "List updated")
    MailingListView update(@PathVariable String listId, @Valid @RequestBody MailingListUpdate update);

    @Operation(summary = "Archive or restore a list",
            description = "Archiving returns scheduled campaigns to draft. Subscribers can still opt out.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status applied"),
            @ApiResponse(responseCode = "422", description = "A campaign is still sending",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    MailingListView changeStatus(@PathVariable String listId, @Valid @RequestBody MailingListStatusChange change);

    @Operation(summary = "Delete an archived list",
            description = "Removes every subscriber and campaign on it. The delivery log keeps its rows.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "List deleted"),
            @ApiResponse(responseCode = "422", description = "The list is still active",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    ResponseEntity<Void> delete(@PathVariable String listId);

    @Operation(summary = "Daily growth of one list", description = "One point per UTC day, oldest first.")
    @ApiResponse(responseCode = "200", description = "Series returned")
    List<GrowthPoint> growth(
            @PathVariable String listId,
            @Parameter(description = "How many days back, today included")
            @RequestParam(required = false, defaultValue = "30") @Min(1) @Max(365) int days);
}
