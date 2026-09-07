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
import com.bimap.iam.modules.auth.service.AuthenticationService;
import com.bimap.iam.modules.auth.service.ClientFingerprint;
import com.bimap.iam.modules.auth.service.GoogleSignInService;
import com.bimap.iam.modules.auth.service.PasswordService;
import com.bimap.iam.modules.auth.service.RegistrationService;
import com.bimap.iam.modules.user.dto.UserResponse;
import com.bimap.iam.modules.user.service.UserService;
import com.bimap.platform.context.CurrentRequest;
import com.bimap.platform.error.AuthenticationFailedException;
import com.bimap.platform.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/// @author Khova Krishna Pilato
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController implements AuthApi {

    private final AuthenticationService authenticationService;
    private final RegistrationService registrationService;
    private final PasswordService passwordService;
    private final GoogleSignInService googleSignInService;
    private final UserService userService;

    @Override
    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(registrationService.register(request));
    }

    @Override
    @PostMapping("/login")
    public AuthenticatedSession login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        return authenticationService.signIn(request, ClientFingerprint.from(httpRequest));
    }

    @Override
    @PostMapping("/google")
    public AuthenticatedSession google(@Valid @RequestBody GoogleSignInRequest request, HttpServletRequest httpRequest) {
        return googleSignInService.signIn(request.idToken(), ClientFingerprint.from(httpRequest));
    }

    @Override
    @PostMapping("/refresh")
    public AuthenticatedSession refresh(@Valid @RequestBody RefreshRequest request, HttpServletRequest httpRequest) {
        return authenticationService.refresh(request.refreshToken(), ClientFingerprint.from(httpRequest));
    }

    @Override
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        authenticationService.signOut(callerEmail());
        return ResponseEntity.noContent().build();
    }

    @Override
    @PostMapping("/activate")
    public AuthenticatedSession activate(@Valid @RequestBody ActivationRequest request, HttpServletRequest httpRequest) {
        return registrationService.activate(request.token(), ClientFingerprint.from(httpRequest));
    }

    @Override
    @PostMapping("/activate/resend")
    public ResponseEntity<OperationResult> resendActivation(@Valid @RequestBody ForgotPasswordRequest request) {
        registrationService.resendActivation(request.email());
        return ResponseEntity.accepted().body(OperationResult.of(
                "If that address is waiting for confirmation, a new link is on its way."));
    }

    @Override
    @PostMapping("/password/forgot")
    public ResponseEntity<OperationResult> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordService.requestReset(request.email());
        return ResponseEntity.accepted().body(OperationResult.of(
                "If that address has an account, a reset link is on its way."));
    }

    @Override
    @PostMapping("/password/reset")
    public OperationResult resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordService.reset(request);
        return OperationResult.of("Your password has been updated. Sign in with the new one.");
    }

    @Override
    @PostMapping("/password/change")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        passwordService.change(callerEmail(), request);
        return ResponseEntity.noContent().build();
    }

    @Override
    @GetMapping("/email-availability")
    public EmailAvailability emailAvailability(@RequestParam String email) {
        return new EmailAvailability(email, userService.isEmailAvailable(email));
    }

    private static String callerEmail() {
        return CurrentRequest.userEmail().orElseThrow(() -> new AuthenticationFailedException(
                ErrorCode.AUTHENTICATION_REQUIRED, "This endpoint requires a signed-in account."));
    }
}
