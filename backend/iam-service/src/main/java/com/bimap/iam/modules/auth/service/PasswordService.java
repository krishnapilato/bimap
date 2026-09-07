package com.bimap.iam.modules.auth.service;

import com.bimap.iam.modules.auth.dto.ChangePasswordRequest;
import com.bimap.iam.modules.auth.dto.ResetPasswordRequest;
import com.bimap.iam.modules.notification.service.NotificationService;
import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.domain.AuthProvider;
import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.iam.modules.user.repository.UserAccountRepository;
import com.bimap.platform.error.AuthenticationFailedException;
import com.bimap.platform.error.BusinessRuleException;
import com.bimap.platform.error.ErrorCode;
import com.bimap.platform.error.ResourceNotFoundException;
import com.bimap.platform.security.JwtProperties;
import com.bimap.platform.security.TokenType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/// Forgotten, reset and changed passwords.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordService {

    private final UserAccountRepository accounts;
    private final SecurityTokenService tokenService;
    private final NotificationService notifications;
    private final PasswordEncoder passwordEncoder;
    private final JwtProperties jwtProperties;

    /// Always reports success. Whether the address exists is not the caller business.
    @Transactional
    public void requestReset(String email) {
        accounts.findByEmailIgnoreCase(email)
                .filter(account -> account.getAuthProvider() == AuthProvider.LOCAL)
                .filter(account -> !account.getStatus().isTerminal())
                .ifPresentOrElse(account -> {
                    tokenService.revokeAll(account, TokenType.PASSWORD_RESET);
                    var token = tokenService.issueSingleUseToken(account, TokenType.PASSWORD_RESET);
                    notifications.sendPasswordReset(account, token.value(), jwtProperties.passwordResetTokenTtl());
                    log.info("Password reset requested for {}", account.getEmail());
                }, () -> log.debug("Password reset requested for an address we cannot serve"));
    }

    @Transactional
    public void reset(ResetPasswordRequest request) {
        var account = tokenService.consumeSingleUseToken(request.token(), TokenType.PASSWORD_RESET);

        if (passwordEncoder.matches(request.newPassword(), account.getPasswordHash())) {
            throw new BusinessRuleException("Choose a password you have not used before.");
        }

        if (account.getStatus() == AccountStatus.PENDING_ACTIVATION) {
            account.activate(Instant.now());
        }
        applyNewPassword(account, request.newPassword());
        log.info("Password reset completed for {}", account.getEmail());
    }

    @Transactional
    public void change(String email, ChangePasswordRequest request) {
        var account = accounts.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Account", email));

        if (account.getAuthProvider() != AuthProvider.LOCAL) {
            throw new BusinessRuleException("This account signs in with Google and has no password.");
        }
        if (!passwordEncoder.matches(request.currentPassword(), account.getPasswordHash())) {
            throw new AuthenticationFailedException(ErrorCode.INVALID_CREDENTIALS,
                    "The current password is not correct.");
        }
        if (passwordEncoder.matches(request.newPassword(), account.getPasswordHash())) {
            throw new BusinessRuleException("The new password must differ from the current one.");
        }

        applyNewPassword(account, request.newPassword());
        log.info("Password changed for {}", account.getEmail());
    }

    /// Changing a password ends every other session; that is the point of changing it.
    private void applyNewPassword(UserAccount account, String rawPassword) {
        account.changePassword(passwordEncoder.encode(rawPassword), Instant.now());
        tokenService.revokeAll(account, TokenType.REFRESH);
        notifications.sendPasswordChanged(account);
    }
}
