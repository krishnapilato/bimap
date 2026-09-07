package com.bimap.iam.modules.auth.domain;

import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.platform.security.TokenType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/// Server-side record of one issued token, so it can be consumed once and revoked at will.
/// @author Khova Krishna Pilato
@Entity
@Table(
        name = "security_token",
        uniqueConstraints = @UniqueConstraint(name = "uk_security_token_token_id", columnNames = "token_id"),
        indexes = {
                @Index(name = "ix_security_token_user_purpose", columnList = "user_id, purpose"),
                @Index(name = "ix_security_token_expires_at", columnList = "expires_at")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SecurityToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /// The `jti` of the signed token this row tracks.
    @Column(name = "token_id", nullable = false, updatable = false, length = 36)
    private String tokenId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private TokenType purpose;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @jakarta.persistence.ForeignKey(name = "fk_security_token_user"))
    private UserAccount user;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    /// Set when a refresh token is rotated, so reuse of the old one is detectable.
    @Column(name = "replaced_by_token_id", length = 36)
    private String replacedByTokenId;

    @Column(name = "client_ip", length = 45)
    private String clientIp;

    @Column(name = "user_agent", length = 256)
    private String userAgent;

    public boolean isUsable(Instant now) {
        return consumedAt == null && revokedAt == null && expiresAt.isAfter(now);
    }

    public boolean wasAlreadyUsed() {
        return consumedAt != null;
    }

    public void consume(Instant now) {
        consumedAt = now;
    }

    public void revoke(Instant now) {
        if (revokedAt == null) {
            revokedAt = now;
        }
    }
}
