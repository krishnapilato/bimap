package com.bimap.iam.modules.auth.service;

import com.bimap.iam.config.AuthProperties;
import com.bimap.iam.modules.auth.dto.AuthenticatedSession;
import com.bimap.iam.modules.auth.dto.LoginRequest;
import com.bimap.iam.modules.notification.service.NotificationService;
import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.domain.AuthProvider;
import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.iam.modules.user.mapper.UserMapper;
import com.bimap.iam.modules.user.repository.UserAccountRepository;
import com.bimap.platform.error.AuthenticationFailedException;
import com.bimap.platform.error.ErrorCode;
import com.bimap.platform.security.TokenType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

/// Sign-in, refresh and sign-out.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserAccountRepository accounts;
    private final SecurityTokenService tokenService;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notifications;
    private final AuthProperties authProperties;
    private final UserMapper userMapper;

    @Transactional
    public AuthenticatedSession signIn(LoginRequest request, ClientFingerprint client) {
        var now = Instant.now();
        var account = accounts.findByEmailIgnoreCase(request.email())
                .orElseThrow(AuthenticationService::rejectCredentials);

        guardAccountState(account, now);

        if (account.getAuthProvider() != AuthProvider.LOCAL || account.getPasswordHash() == null) {
            throw new AuthenticationFailedException(ErrorCode.INVALID_CREDENTIALS,
                    "This account signs in with Google. Use the Google button instead.");
        }

        if (!passwordEncoder.matches(request.password(), account.getPasswordHash())) {
            registerFailure(account, now);
            throw rejectCredentials();
        }

        account.recordSuccessfulLogin(now);
        log.info("Sign-in succeeded for {}", account.getEmail());
        return openSession(account, client);
    }

    @Transactional
    public AuthenticatedSession refresh(String refreshToken, ClientFingerprint client) {
        var rotation = tokenService.rotateRefreshToken(refreshToken, client);
        var account = rotation.account();

        guardAccountState(account, Instant.now());

        var access = tokenService.issueAccessToken(account);
        return AuthenticatedSession.bearer(access.value(), rotation.refreshToken().value(),
                access.expiresInSeconds(), userMapper.toResponse(account));
    }

    @Transactional
    public void signOut(String email) {
        accounts.findByEmailIgnoreCase(email)
                .ifPresent(account -> tokenService.revokeAll(account, TokenType.REFRESH));
    }

    /// Issues the pair a client needs after any successful authentication.
    AuthenticatedSession openSession(UserAccount account, ClientFingerprint client) {
        var access = tokenService.issueAccessToken(account);
        var refresh = tokenService.issueRefreshToken(account, client);
        return AuthenticatedSession.bearer(access.value(), refresh.value(),
                access.expiresInSeconds(), userMapper.toResponse(account));
    }

    private void registerFailure(UserAccount account, Instant now) {
        account.recordFailedLogin(authProperties.maxFailedLoginAttempts(), authProperties.lockoutDuration(), now);

        if (account.isLockedOut(now)) {
            log.warn("Account {} locked after {} failed sign-in attempts",
                    account.getEmail(), account.getFailedLoginAttempts());
            notifications.sendAccountLocked(account, authProperties.lockoutDuration());
        }
    }

    private static void guardAccountState(UserAccount account, Instant now) {
        if (account.isLockedOut(now)) {
            throw new AuthenticationFailedException(ErrorCode.ACCOUNT_LOCKED,
                    "Too many failed attempts. Try again after %s.".formatted(account.getLockedUntil()));
        }

        switch (account.getStatus()) {
            case ACTIVE -> {
            }
            case PENDING_ACTIVATION -> throw new AuthenticationFailedException(ErrorCode.ACCOUNT_NOT_ACTIVATED,
                    "Confirm your email address before signing in.");
            case LOCKED -> throw new AuthenticationFailedException(ErrorCode.ACCOUNT_LOCKED,
                    "This account is locked. Contact an administrator.");
            case DISABLED, DELETED -> throw new AuthenticationFailedException(ErrorCode.ACCOUNT_DISABLED,
                    "This account is no longer active.");
        }
    }

    /// Wrong password and unknown address answer identically, so the endpoint cannot be used to
    /// discover which addresses are registered.
    private static AuthenticationFailedException rejectCredentials() {
        return AuthenticationFailedException.invalidCredentials();
    }

    Optional<UserAccount> findByEmail(String email) {
        return accounts.findByEmailIgnoreCase(email);
    }
}
