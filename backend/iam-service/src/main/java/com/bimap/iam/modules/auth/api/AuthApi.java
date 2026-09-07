package com.bimap.iam.modules.auth.api;

import com.bimap.iam.modules.auth.dto.ActivationRequest;
import com.bimap.iam.modules.auth.dto.AuthenticatedSession;
import com.bimap.iam.modules.auth.dto.ChangePasswordRequest;
import com.bimap.iam.modules.auth.dto.EmailAvailability;
import com.bimap.iam.modules.auth.dto.ForgotPasswordRequest;
import com.bimap.iam.modules.auth.dto.GoogleSignInRequest;
import com.bimap.iam.modules.auth.dto.LoginRequest;
import com.bimap.iam.modules.auth.dto.OperationResult;
import com.bimap.iam.modules.auth.dto.RefreshRequest;
import com.bimap.iam.modules.auth.dto.RegistrationRequest;
import com.bimap.iam.modules.auth.dto.ResetPasswordRequest;
import com.bimap.iam.modules.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

/// The documented contract for `/api/v1/auth`.
///
/// Every OpenAPI annotation lives here so the controller stays a thin adapter: read the
/// interface to learn what the API promises, read the controller to see how it delegates.
///
/// @author Khova Krishna Pilato
@Tag(name = "Authentication", description = "Sign-in, registration, activation and password recovery")
public interface AuthApi {

    @Operation(summary = "Register a new account",
            description = "Creates an account in PENDING_ACTIVATION and emails a confirmation link.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Account created, activation email queued"),
            @ApiResponse(responseCode = "409", description = "Email address already registered",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "422", description = "Self-registration is closed",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    ResponseEntity<UserResponse> register(@Valid @RequestBody RegistrationRequest request);

    @Operation(summary = "Sign in with email and password",
            description = "Returns an access token and a refresh token. Repeated failures lock the account.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authenticated"),
            @ApiResponse(responseCode = "401", description = "Invalid credentials",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "403", description = "Account not activated, locked or disabled",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    AuthenticatedSession login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest);

    @Operation(summary = "Sign in with Google",
            description = "Exchanges a Google ID token for a BiMap session, creating or linking the account.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Authenticated"),
            @ApiResponse(responseCode = "401", description = "The Google token could not be verified",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    AuthenticatedSession google(@Valid @RequestBody GoogleSignInRequest request, HttpServletRequest httpRequest);

    @Operation(summary = "Exchange a refresh token",
            description = "Rotates the refresh token. Presenting one twice revokes every session on the account.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "New token pair issued"),
            @ApiResponse(responseCode = "401", description = "Refresh token expired, revoked or already used",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    AuthenticatedSession refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest);

    @Operation(summary = "Sign out", description = "Revokes every refresh token held by the caller.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponse(responseCode = "204", description = "Signed out")
    ResponseEntity<Void> logout();

    @Operation(summary = "Activate an account",
            description = "Consumes the emailed activation token and signs the account in.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Account activated and signed in"),
            @ApiResponse(responseCode = "401", description = "Activation link expired or already used",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    AuthenticatedSession activate(@Valid @RequestBody ActivationRequest request, HttpServletRequest httpRequest);

    @Operation(summary = "Resend the activation email",
            description = "Always reports success, so the endpoint cannot be used to probe for accounts.")
    @ApiResponse(responseCode = "202", description = "Request accepted")
    ResponseEntity<OperationResult> resendActivation(@Valid @RequestBody ForgotPasswordRequest request);

    @Operation(summary = "Start password recovery",
            description = "Always reports success, so the endpoint cannot be used to probe for accounts.")
    @ApiResponse(responseCode = "202", description = "Request accepted")
    ResponseEntity<OperationResult> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request);

    @Operation(summary = "Complete password recovery",
            description = "Consumes the emailed reset token, sets the new password and ends all other sessions.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Password updated"),
            @ApiResponse(responseCode = "401", description = "Reset link expired or already used",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    OperationResult resetPassword(@Valid @RequestBody ResetPasswordRequest request);

    @Operation(summary = "Change your own password",
            description = "Requires the current password and ends every other session.",
            security = @SecurityRequirement(name = "bearerAuth"))
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Password changed"),
            @ApiResponse(responseCode = "401", description = "The current password is wrong",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request);

    @Operation(summary = "Check whether an email address is free",
            description = "Used by the sign-up form before submitting.")
    @ApiResponse(responseCode = "200", description = "Availability reported")
    EmailAvailability emailAvailability(
            @Parameter(description = "Address to check", example = "mario.rossi@example.com")
            @RequestParam String email);
}
