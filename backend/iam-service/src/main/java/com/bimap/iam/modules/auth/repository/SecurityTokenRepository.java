package com.bimap.iam.modules.auth.repository;

import com.bimap.iam.modules.auth.domain.SecurityToken;
import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.platform.security.TokenType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

/// @author Khova Krishna Pilato
public interface SecurityTokenRepository extends JpaRepository<SecurityToken, Long> {

    /// The owner is always needed alongside the token, so it is fetched in the same query rather
    /// than left as a lazy proxy that a later bulk update could detach.
    @EntityGraph(attributePaths = "user")
    Optional<SecurityToken> findByTokenIdAndPurpose(String tokenId, TokenType purpose);

    /// Invalidates every outstanding token of one kind, used on sign-out and password change.
    ///
    /// Pending changes are flushed first so nothing in the unit of work is lost, but the
    /// persistence context is deliberately left intact: clearing it here would detach entities the
    /// caller is still working with.
    @Modifying(flushAutomatically = true)
    @Query("""
            UPDATE SecurityToken t
               SET t.revokedAt = :now
             WHERE t.user = :user
               AND t.purpose = :purpose
               AND t.revokedAt IS NULL
               AND t.consumedAt IS NULL
            """)
    int revokeAllFor(@Param("user") UserAccount user, @Param("purpose") TokenType purpose, @Param("now") Instant now);

    /// Same as above, addressed by id so it can be called from a transaction that does not share
    /// the caller persistence context.
    @Modifying(flushAutomatically = true)
    @Query("""
            UPDATE SecurityToken t
               SET t.revokedAt = :now
             WHERE t.user.id = :userId
               AND t.purpose = :purpose
               AND t.revokedAt IS NULL
               AND t.consumedAt IS NULL
            """)
    int revokeAllForUser(@Param("userId") Long userId, @Param("purpose") TokenType purpose,
                         @Param("now") Instant now);

    @Modifying
    @Query("DELETE FROM SecurityToken t WHERE t.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);

    long countByUserAndPurposeAndRevokedAtIsNullAndConsumedAtIsNull(UserAccount user, TokenType purpose);
}
