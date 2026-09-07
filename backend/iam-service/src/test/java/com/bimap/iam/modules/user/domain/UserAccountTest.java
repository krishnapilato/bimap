package com.bimap.iam.modules.user.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/// @author Khova Krishna Pilato
class UserAccountTest {

    private static final Duration LOCKOUT = Duration.ofMinutes(15);
    private static final int MAX_ATTEMPTS = 3;

    private static UserAccount active() {
        return UserAccount.builder()
                .firstName("Mario")
                .lastName("Rossi")
                .email("mario.rossi@example.com")
                .status(AccountStatus.ACTIVE)
                .role(ApplicationRole.USER)
                .authProvider(AuthProvider.LOCAL)
                .build();
    }

    @Test
    @DisplayName("failed sign-ins lock the account only once the threshold is reached")
    void locksAfterRepeatedFailures() {
        var account = active();
        var now = Instant.now();

        account.recordFailedLogin(MAX_ATTEMPTS, LOCKOUT, now);
        account.recordFailedLogin(MAX_ATTEMPTS, LOCKOUT, now);
        assertThat(account.isLockedOut(now)).isFalse();

        account.recordFailedLogin(MAX_ATTEMPTS, LOCKOUT, now);
        assertThat(account.isLockedOut(now)).isTrue();
        assertThat(account.canAuthenticate(now)).isFalse();
    }

    @Test
    @DisplayName("a brute-force lock expires on its own, and never changes the account status")
    void lockoutIsTemporaryAndDoesNotTouchStatus() {
        var account = active();
        var now = Instant.now();

        for (var attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            account.recordFailedLogin(MAX_ATTEMPTS, LOCKOUT, now);
        }

        assertThat(account.getStatus())
                .as("an administrator lock and a brute-force lock must stay distinguishable")
                .isEqualTo(AccountStatus.ACTIVE);
        assertThat(account.isLockedOut(now.plus(LOCKOUT).plusSeconds(1))).isFalse();
    }

    @Test
    @DisplayName("a successful sign-in clears the failure count")
    void successResetsTheCounter() {
        var account = active();
        var now = Instant.now();

        account.recordFailedLogin(MAX_ATTEMPTS, LOCKOUT, now);
        account.recordSuccessfulLogin(now);

        assertThat(account.getFailedLoginAttempts()).isZero();
        assertThat(account.getLockedUntil()).isNull();
        assertThat(account.getLastLoginAt()).isEqualTo(now);
    }

    @Test
    @DisplayName("full name joins the two parts and tolerates stray spacing")
    void buildsFullName() {
        assertThat(active().fullName()).isEqualTo("Mario Rossi");
    }

    @Test
    @DisplayName("only an active account may sign in")
    void onlyActiveAccountsAuthenticate() {
        var now = Instant.now();

        for (var status : AccountStatus.values()) {
            var account = active();
            account.setStatus(status);
            assertThat(account.canAuthenticate(now))
                    .as("status %s", status)
                    .isEqualTo(status == AccountStatus.ACTIVE);
        }
    }

    @Test
    @DisplayName("the lifecycle refuses moves that make no sense")
    void guardsLifecycleTransitions() {
        assertThat(AccountStatus.PENDING_ACTIVATION.canTransitionTo(AccountStatus.ACTIVE)).isTrue();
        assertThat(AccountStatus.ACTIVE.canTransitionTo(AccountStatus.LOCKED)).isTrue();
        assertThat(AccountStatus.LOCKED.canTransitionTo(AccountStatus.ACTIVE)).isTrue();
        assertThat(AccountStatus.DELETED.canTransitionTo(AccountStatus.ACTIVE)).isFalse();
        assertThat(AccountStatus.ACTIVE.canTransitionTo(AccountStatus.PENDING_ACTIVATION)).isFalse();
    }

    @Test
    @DisplayName("changing the password clears any brute-force lock")
    void passwordChangeClearsLockout() {
        var account = active();
        var now = Instant.now();

        for (var attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            account.recordFailedLogin(MAX_ATTEMPTS, LOCKOUT, now);
        }
        account.changePassword("{bcrypt}whatever", now);

        assertThat(account.isLockedOut(now)).isFalse();
        assertThat(account.getPasswordChangedAt()).isEqualTo(now);
    }

    @Test
    @DisplayName("roles carry the permissions the token will advertise")
    void rolesExposePermissions() {
        assertThat(ApplicationRole.USER.authorities())
                .containsExactlyInAnyOrder("registration:read", "registration:write");
        assertThat(ApplicationRole.MANAGER.authorities()).contains("registration:read-all");
        assertThat(ApplicationRole.ADMINISTRATOR.authorities()).contains("user:lifecycle");
        assertThat(ApplicationRole.ADMINISTRATOR.isAtLeast(ApplicationRole.MANAGER)).isTrue();
        assertThat(ApplicationRole.USER.isAtLeast(ApplicationRole.MANAGER)).isFalse();
    }
}
