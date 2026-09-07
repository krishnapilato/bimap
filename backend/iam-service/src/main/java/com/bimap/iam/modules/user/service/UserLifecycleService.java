package com.bimap.iam.modules.user.service;

import com.bimap.iam.config.AuthProperties;
import com.bimap.iam.modules.auth.service.SecurityTokenService;
import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.iam.modules.user.dto.AccountStatusChange;
import com.bimap.iam.modules.user.dto.UserResponse;
import com.bimap.iam.modules.user.mapper.UserMapper;
import com.bimap.iam.modules.user.repository.UserAccountRepository;
import com.bimap.platform.context.CurrentRequest;
import com.bimap.platform.error.BusinessRuleException;
import com.bimap.platform.error.ResourceNotFoundException;
import com.bimap.platform.security.TokenType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/// Moves accounts between lifecycle states, and sweeps the ones that never woke up.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
public class UserLifecycleService {

    private final UserAccountRepository accounts;
    private final SecurityTokenService tokenService;
    private final AuthProperties authProperties;
    private final UserMapper userMapper;

    @Transactional
    public UserResponse changeStatus(String publicId, AccountStatusChange change) {
        var account = accounts.findByPublicId(publicId)
                .orElseThrow(() -> new ResourceNotFoundException("User", publicId));

        guardSelfDemotion(account, change.status());

        var current = account.getStatus();
        if (current == change.status()) {
            return userMapper.toResponse(account);
        }
        if (!current.canTransitionTo(change.status())) {
            throw new BusinessRuleException("An account cannot move from %s to %s."
                    .formatted(current, change.status()));
        }

        applyTransition(account, change.status());
        log.info("{} moved from {} to {}{}", account.getEmail(), current, change.status(),
                change.reason() == null ? "" : " (" + change.reason() + ")");
        return userMapper.toResponse(account);
    }

    /// Soft delete. The row survives so past registrations keep a real author.
    @Transactional
    public void delete(String publicId) {
        changeStatus(publicId, new AccountStatusChange(AccountStatus.DELETED, "Deleted by administrator"));
    }

    /// Drops registrations that were never confirmed, along with their dead tokens.
    @Scheduled(cron = "${bimap.auth.stale-activation-sweep-cron:0 30 3 * * *}")
    @Transactional
    public void purgeStaleRegistrations() {
        var cutoff = Instant.now().minus(authProperties.staleActivationAfter());
        var stale = accounts.findByStatusAndCreatedAtBefore(AccountStatus.PENDING_ACTIVATION, cutoff);

        if (!stale.isEmpty()) {
            accounts.deleteAll(stale);
            log.info("Removed {} registrations that were never confirmed", stale.size());
        }
        var purged = tokenService.purgeExpired(Instant.now().minus(Duration.ofDays(1)));
        if (purged > 0) {
            log.info("Purged {} expired security tokens", purged);
        }
    }

    private void applyTransition(UserAccount account, AccountStatus target) {
        var now = Instant.now();
        account.setStatus(target);

        switch (target) {
            case ACTIVE -> account.activate(now);
            case LOCKED, DISABLED -> tokenService.revokeAll(account, TokenType.REFRESH);
            case DELETED -> {
                account.setDeletedAt(now);
                tokenService.revokeAll(account, TokenType.REFRESH);
            }
            case PENDING_ACTIVATION -> account.setActivatedAt(null);
        }
    }

    /// An administrator locking themselves out of the only administrator account is not a
    /// recoverable mistake, so it is refused.
    private static void guardSelfDemotion(UserAccount target, AccountStatus next) {
        var actingOnSelf = CurrentRequest.userEmail()
                .filter(email -> email.equalsIgnoreCase(target.getEmail()))
                .isPresent();

        if (actingOnSelf && next != AccountStatus.ACTIVE) {
            throw new BusinessRuleException("You cannot " + next.name().toLowerCase(java.util.Locale.ROOT)
                    + " your own account.");
        }
    }
}
