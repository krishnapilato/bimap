package com.bimap.iam.modules.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/// A person who can sign in to BiMap.
/// @author Khova Krishna Pilato
@Entity
@Table(
        name = "user_account",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_account_email", columnNames = "email"),
                @UniqueConstraint(name = "uk_user_account_public_id", columnNames = "public_id")
        },
        indexes = {
                @Index(name = "ix_user_account_status", columnList = "status"),
                @Index(name = "ix_user_account_external_id", columnList = "external_id")
        })
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /// Stable identifier safe to expose in URLs and tokens.
    @Column(name = "public_id", nullable = false, updatable = false, length = 36)
    @Builder.Default
    private String publicId = UUID.randomUUID().toString();

    @Column(name = "first_name", nullable = false, length = 80)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 80)
    private String lastName;

    @Column(nullable = false, length = 254)
    private String email;

    /// Null for accounts that only ever sign in through Google.
    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    @Builder.Default
    private AccountStatus status = AccountStatus.PENDING_ACTIVATION;

    @Enumerated(EnumType.STRING)
    @Column(name = "application_role", nullable = false, length = 24)
    @Builder.Default
    private ApplicationRole role = ApplicationRole.USER;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false, length = 16)
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.LOCAL;

    /// Subject claim from the external identity provider, when there is one.
    @Column(name = "external_id", length = 128)
    private String externalId;

    @Column(name = "avatar_url", length = 512)
    private String avatarUrl;

    @Column(length = 16)
    @Builder.Default
    private String locale = "it-IT";

    @Column(name = "failed_login_attempts", nullable = false)
    @Builder.Default
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "password_changed_at")
    private Instant passwordChangedAt;

    @Column(name = "activated_at")
    private Instant activatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private long version = 0L;

    public String fullName() {
        return "%s %s".formatted(firstName, lastName).strip();
    }

    public boolean isLockedOut(Instant now) {
        return lockedUntil != null && lockedUntil.isAfter(now);
    }

    /// True when the account may sign in right now, ignoring the password itself.
    public boolean canAuthenticate(Instant now) {
        return status.canSignIn() && !isLockedOut(now);
    }

    public void recordSuccessfulLogin(Instant now) {
        failedLoginAttempts = 0;
        lockedUntil = null;
        lastLoginAt = now;
    }

    /// Counts a bad password and starts a cooling-off period once the threshold is reached.
    ///
    /// This never touches {@code status}: a temporary brute-force lock and an administrator
    /// disabling the account are different things, and only the latter should survive a
    /// successful password reset.
    public void recordFailedLogin(int maxAttempts, java.time.Duration lockDuration, Instant now) {
        failedLoginAttempts++;
        if (failedLoginAttempts >= maxAttempts) {
            lockedUntil = now.plus(lockDuration);
        }
    }

    public void activate(Instant now) {
        status = AccountStatus.ACTIVE;
        activatedAt = now;
        failedLoginAttempts = 0;
        lockedUntil = null;
    }

    public void changePassword(String encodedPassword, Instant now) {
        passwordHash = encodedPassword;
        passwordChangedAt = now;
        failedLoginAttempts = 0;
        lockedUntil = null;
    }
}
