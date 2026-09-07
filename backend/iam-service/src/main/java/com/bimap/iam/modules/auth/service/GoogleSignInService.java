package com.bimap.iam.modules.auth.service;

import com.bimap.iam.modules.auth.client.GoogleTokenInfo;
import com.bimap.iam.modules.auth.client.GoogleTokenVerifier;
import com.bimap.iam.modules.auth.dto.AuthenticatedSession;
import com.bimap.iam.modules.notification.service.NotificationService;
import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.domain.ApplicationRole;
import com.bimap.iam.modules.user.domain.AuthProvider;
import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.iam.modules.user.repository.UserAccountRepository;
import com.bimap.platform.error.AuthenticationFailedException;
import com.bimap.platform.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/// Signs a user in with a Google ID token, creating or linking the local account as needed.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleSignInService {

    private final GoogleTokenVerifier verifier;
    private final UserAccountRepository accounts;
    private final AuthenticationService authenticationService;
    private final NotificationService notifications;

    @Transactional
    public AuthenticatedSession signIn(String idToken, ClientFingerprint client) {
        var identity = verifier.verify(idToken);
        var now = Instant.now();

        var account = accounts.findByExternalId(identity.sub())
                .or(() -> accounts.findByEmailIgnoreCase(identity.email()))
                .map(existing -> link(existing, identity, now))
                .orElseGet(() -> provision(identity, now));

        if (!account.getStatus().canSignIn()) {
            throw new AuthenticationFailedException(ErrorCode.ACCOUNT_DISABLED,
                    "This account is no longer active.");
        }

        account.recordSuccessfulLogin(now);
        return authenticationService.openSession(account, client);
    }

    /// Google has already proved the address, so an account waiting on activation becomes active.
    private UserAccount link(UserAccount account, GoogleTokenInfo identity, Instant now) {
        if (account.getExternalId() == null) {
            account.setExternalId(identity.sub());
            log.info("Linked Google identity to existing account {}", account.getEmail());
        }
        if (account.getAvatarUrl() == null) {
            account.setAvatarUrl(identity.picture());
        }
        if (account.getStatus() == AccountStatus.PENDING_ACTIVATION) {
            account.activate(now);
            notifications.sendWelcome(account);
        }
        return account;
    }

    private UserAccount provision(GoogleTokenInfo identity, Instant now) {
        var account = accounts.save(UserAccount.builder()
                .firstName(identity.firstNameOrFallback())
                .lastName(identity.lastNameOrFallback())
                .email(identity.email())
                .status(AccountStatus.ACTIVE)
                .role(ApplicationRole.USER)
                .authProvider(AuthProvider.GOOGLE)
                .externalId(identity.sub())
                .avatarUrl(identity.picture())
                .locale(identity.locale() == null ? "it-IT" : identity.locale())
                .activatedAt(now)
                .build());

        log.info("Provisioned {} from Google sign-in", account.getEmail());
        notifications.sendWelcome(account);
        return account;
    }
}
