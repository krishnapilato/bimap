package com.bimap.iam.modules.mailing.api;

import com.bimap.iam.modules.mailing.domain.CampaignStatus;
import com.bimap.iam.modules.mailing.dto.CampaignRequest;
import com.bimap.iam.modules.mailing.dto.CampaignSchedule;
import com.bimap.iam.modules.mailing.dto.CampaignTestRequest;
import com.bimap.iam.modules.mailing.dto.CampaignUpdate;
import com.bimap.iam.modules.mailing.dto.CampaignView;
import com.bimap.iam.modules.notification.domain.DeliveryStatus;
import com.bimap.iam.modules.notification.dto.SentEmailResponse;
import com.bimap.platform.web.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

/// The documented contract for `/api/v1/mailing-lists/{listId}/campaigns`.
/// @author Khova Krishna Pilato
@Tag(name = "Campaigns", description = "Messages written once and sent to everyone subscribed to a list")
@SecurityRequirement(name = "bearerAuth")
public interface CampaignApi {

    @Operation(summary = "List campaigns", description = "With delivery progress read from the delivery log.")
    @ApiResponse(responseCode = "200", description = "Page of campaigns")
    PageResponse<CampaignView> search(@PathVariable String listId,
                                      @RequestParam(required = false) CampaignStatus status,
                                      @ParameterObject Pageable pageable);

    @Operation(summary = "Read one campaign")
    @ApiResponse(responseCode = "200", description = "Campaign returned")
    CampaignView findOne(@PathVariable String listId, @PathVariable String campaignId);

    @Operation(summary = "Write a draft",
            description = "The body may be markup or prose and use `{{firstName}}`, `{{lastName}}`, `{{fullName}}`, "
                    + "`{{email}}`, `{{listName}}`, `{{manageUrl}}` and `{{unsubscribeUrl}}`.")
    @ApiResponse(responseCode = "201", description = "Draft created")
    ResponseEntity<CampaignView> create(@PathVariable String listId, @Valid @RequestBody CampaignRequest request);

    @Operation(summary = "Edit a draft or scheduled campaign")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Campaign updated"),
            @ApiResponse(responseCode = "422", description = "It has already started sending",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    CampaignView update(@PathVariable String listId, @PathVariable String campaignId,
                        @Valid @RequestBody CampaignUpdate update);

    @Operation(summary = "Delete a campaign that never started sending")
    @ApiResponse(responseCode = "204", description = "Campaign deleted")
    ResponseEntity<Void> delete(@PathVariable String listId, @PathVariable String campaignId);

    @Operation(summary = "Copy a campaign into a new draft")
    @ApiResponse(responseCode = "201", description = "Draft created")
    ResponseEntity<CampaignView> duplicate(@PathVariable String listId, @PathVariable String campaignId);

    @Operation(summary = "Schedule a campaign", description = "It launches within half a minute of `sendAt`.")
    @ApiResponse(responseCode = "200", description = "Campaign scheduled")
    CampaignView schedule(@PathVariable String listId, @PathVariable String campaignId,
                          @Valid @RequestBody CampaignSchedule schedule);

    @Operation(summary = "Return a scheduled campaign to draft")
    @ApiResponse(responseCode = "200", description = "Campaign unscheduled")
    CampaignView unschedule(@PathVariable String listId, @PathVariable String campaignId);

    @Operation(summary = "Send now",
            description = "Starts delivery in the background and returns at once; poll the campaign for progress.")
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Sending started"),
            @ApiResponse(responseCode = "409", description = "Already being sent",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "422", description = "Archived list, or nobody subscribed yet",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    ResponseEntity<CampaignView> send(@PathVariable String listId, @PathVariable String campaignId);

    @Operation(summary = "Stop a campaign that is sending", description = "Nobody still waiting will receive it.")
    @ApiResponse(responseCode = "200", description = "Campaign cancelled")
    CampaignView cancel(@PathVariable String listId, @PathVariable String campaignId);

    @Operation(summary = "Send a test",
            description = "Through the real pipeline, with a `[Test]` subject. Never counted in the results.")
    @ApiResponse(responseCode = "201", description = "The delivery-log row of the test")
    ResponseEntity<SentEmailResponse> sendTest(@PathVariable String listId, @PathVariable String campaignId,
                                               @Valid @RequestBody CampaignTestRequest request);

    @Operation(summary = "Who a campaign reached", description = "Its delivery-log rows, newest first.")
    @ApiResponse(responseCode = "200", description = "Page of deliveries")
    PageResponse<SentEmailResponse> deliveries(@PathVariable String listId, @PathVariable String campaignId,
                                               @RequestParam(required = false) DeliveryStatus status,
                                               @ParameterObject Pageable pageable);
}
