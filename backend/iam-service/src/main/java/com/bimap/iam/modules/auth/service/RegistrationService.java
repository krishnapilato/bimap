package com.bimap.iam.modules.auth.service;

import com.bimap.iam.config.AuthProperties;
import com.bimap.iam.modules.auth.dto.AuthenticatedSession;
import com.bimap.iam.modules.auth.dto.RegistrationRequest;
import com.bimap.iam.modules.notification.service.NotificationService;
import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.domain.ApplicationRole;
import com.bimap.iam.modules.user.domain.AuthProvider;
import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.iam.modules.user.dto.UserResponse;
import com.bimap.iam.modules.user.mapper.UserMapper;
import com.bimap.iam.modules.user.repository.UserAccountRepository;
import com.bimap.platform.error.BusinessRuleException;
import com.bimap.platform.error.ErrorCode;
import com.bimap.platform.error.ResourceConflictException;
import com.bimap.platform.security.JwtProperties;
import com.bimap.platform.security.TokenType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/// Sign-up and email confirmation.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final UserAccountRepository accounts;
    private final SecurityTokenService tokenService;
    private final AuthenticationService authenticationService;
    private final NotificationService notifications;
    private final PasswordEncoder passwordEncoder;
    private final AuthProperties authProperties;
    private final JwtProperties jwtProperties;
    private final UserMapper userMapper;

    @Transactional
    public UserResponse register(RegistrationRequest request) {
        if (!authProperties.selfRegistrationEnabled()) {
            throw new BusinessRuleException("Self-registration is closed. Ask an administrator for an invitation.");
        }
        if (accounts.existsByEmailIgnoreCase(request.email())) {
            throw new ResourceConflictException(ErrorCode.EMAIL_ALREADY_REGISTERED,
                    "An account already exists for this email address.");
        }

        var account = accounts.save(UserAccount.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .status(AccountStatus.PENDING_ACTIVATION)
                .role(ApplicationRole.USER)
                .authProvider(AuthProvider.LOCAL)
                .passwordChangedAt(Instant.now())
                .build());

        sendActivationLink(account);
        log.info("Registered {} pending activation", account.getEmail());
        return userMapper.toResponse(account);
    }

    /// Confirms an email address and signs the account in straight away.
    @Transactional
    public AuthenticatedSession activate(String token, ClientFingerprint client) {
        var account = tokenService.consumeSingleUseToken(token, TokenType.ACTIVATION);

        if (account.getStatus() == AccountStatus.PENDING_ACTIVATION) {
            account.activate(Instant.now());
            notifications.sendWelcome(account);
            log.info("Activated {}", account.getEmail());
        }
        if (!account.getStatus().canSignIn()) {
            throw new BusinessRuleException(ErrorCode.ACCOUNT_DISABLED,
                    "This account is no longer active.");
        }
        return authenticationService.openSession(account, client);
    }

    /// Sends a fresh link, and says nothing about whether the address exists.
    @Transactional
    public void resendActivation(String email) {
        accounts.findByEmailIgnoreCase(email)
                .filter(account -> account.getStatus() == AccountStatus.PENDING_ACTIVATION)
                .ifPresent(account -> {
                    tokenService.revokeAll(account, TokenType.ACTIVATION);
                    sendActivationLink(account);
                });
    }

    /// Issues the activation token and hands it to the mail engine.
    public void sendActivationLink(UserAccount account) {
        var token = tokenService.issueSingleUseToken(account, TokenType.ACTIVATION);
        notifications.sendActivation(account, token.value(), jwtProperties.activationTokenTtl());
    }
}
