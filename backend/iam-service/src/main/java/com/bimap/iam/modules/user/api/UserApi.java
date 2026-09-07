package com.bimap.iam.modules.user.api;

import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.dto.AccountStatusChange;
import com.bimap.iam.modules.user.dto.CreateUserRequest;
import com.bimap.iam.modules.user.dto.UpdateUserRequest;
import com.bimap.iam.modules.user.dto.UserResponse;
import com.bimap.iam.modules.user.dto.UserStatistics;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

/// The documented contract for `/api/v1/users`.
/// @author Khova Krishna Pilato
@Tag(name = "Users", description = "Account directory and lifecycle")
@SecurityRequirement(name = "bearerAuth")
public interface UserApi {

    @Operation(summary = "The signed-in account", description = "Resolved from the bearer token, no lookup by id.")
    @ApiResponse(responseCode = "200", description = "Profile returned")
    UserResponse me();

    @Operation(summary = "Search accounts",
            description = "Free-text over name and email, optionally narrowed by status. Soft-deleted rows are hidden.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Page of accounts"),
            @ApiResponse(responseCode = "403", description = "Requires MANAGER or ADMINISTRATOR",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    PageResponse<UserResponse> search(
            @Parameter(description = "Matches first name, last name or email", example = "rossi")
            @RequestParam(required = false) String q,
            @Parameter(description = "Restrict to one lifecycle state")
            @RequestParam(required = false) AccountStatus status,
            @ParameterObject Pageable pageable);

    @Operation(summary = "Headline account counts")
    @ApiResponse(responseCode = "200", description = "Counts returned")
    UserStatistics statistics();

    @Operation(summary = "Read one account")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Account returned"),
            @ApiResponse(responseCode = "404", description = "No such account",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    UserResponse findOne(@Parameter(description = "Public account id") @PathVariable String id);

    @Operation(summary = "Create an account",
            description = "Omit the password to send an invitation and let the recipient choose their own.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Account created"),
            @ApiResponse(responseCode = "409", description = "Email address already registered",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request);

    @Operation(summary = "Update an account", description = "Only the members present in the body are applied.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Account updated"),
            @ApiResponse(responseCode = "404", description = "No such account",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Email address taken by another account",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    UserResponse update(@PathVariable String id, @Valid @RequestBody UpdateUserRequest request);

    @Operation(summary = "Move an account through its lifecycle",
            description = "Illegal transitions are refused. Locking or disabling revokes every session.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "New status applied"),
            @ApiResponse(responseCode = "422", description = "Transition not allowed from the current status",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    UserResponse changeStatus(@PathVariable String id, @Valid @RequestBody AccountStatusChange change);

    @Operation(summary = "Delete an account",
            description = "Soft delete. The row is kept so existing registrations keep their author.")
    @ApiResponse(responseCode = "204", description = "Account deleted")
    ResponseEntity<Void> delete(@PathVariable String id);
}
