package com.bimap.iam.modules.mailing.api;

import com.bimap.iam.modules.auth.dto.OperationResult;
import com.bimap.iam.modules.mailing.dto.PublicListView;
import com.bimap.iam.modules.mailing.dto.SubscribeRequest;
import com.bimap.iam.modules.mailing.dto.SubscriptionTokenRequest;
import com.bimap.iam.modules.mailing.dto.SubscriptionView;
import com.bimap.iam.modules.mailing.dto.UnsubscribeRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

/// The documented contract for `/api/v1/subscriptions`: what anyone can do without an account.
/// @author Khova Krishna Pilato
@Tag(name = "Subscriptions", description = "Public sign-up, confirmation and self-service unsubscribe")
public interface SubscriptionApi {

    @Operation(summary = "A list that accepts public sign-ups")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List returned"),
            @ApiResponse(responseCode = "404", description = "No such list, or it is not open to sign-ups",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    PublicListView publicList(@PathVariable String listId);

    @Operation(summary = "Sign up to a list",
            description = "Always answers the same way, so it cannot reveal who is already subscribed.")
    @ApiResponse(responseCode = "202", description = "Accepted; a confirmation link is on its way when one is needed")
    ResponseEntity<OperationResult> subscribe(@Valid @RequestBody SubscribeRequest request, HttpServletRequest httpRequest);

    @Operation(summary = "Confirm a subscription", description = "Follows the link in the confirmation email.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "The subscription as it now stands"),
            @ApiResponse(responseCode = "404", description = "The link is not valid",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    SubscriptionView confirm(@Valid @RequestBody SubscriptionTokenRequest request, HttpServletRequest httpRequest);

    @Operation(summary = "Read a subscription from its link")
    @ApiResponse(responseCode = "200", description = "Subscription returned")
    SubscriptionView manage(@Parameter(description = "Token from the email link") @RequestParam String token);

    @Operation(summary = "Unsubscribe", description = "Always allowed, whatever the state of the list.")
    @ApiResponse(responseCode = "200", description = "Unsubscribed")
    SubscriptionView unsubscribe(@Valid @RequestBody UnsubscribeRequest request);

    @Operation(summary = "Subscribe again after leaving")
    @ApiResponse(responseCode = "200", description = "Subscribed")
    SubscriptionView resubscribe(@Valid @RequestBody SubscriptionTokenRequest request, HttpServletRequest httpRequest);

    @Operation(summary = "One-click unsubscribe (RFC 8058)",
            description = "The target of the `List-Unsubscribe` header, posted to by the mail client itself.")
    @ApiResponse(responseCode = "200", description = "Unsubscribed")
    ResponseEntity<Void> oneClick(@RequestParam String token);
}
