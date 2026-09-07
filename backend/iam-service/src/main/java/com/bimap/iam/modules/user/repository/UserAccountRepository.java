package com.bimap.iam.modules.user.repository;

import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.domain.UserAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/// @author Khova Krishna Pilato
public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByEmailIgnoreCase(String email);

    Optional<UserAccount> findByPublicId(String publicId);

    Optional<UserAccount> findByExternalId(String externalId);

    boolean existsByEmailIgnoreCase(String email);

    /// Free-text search across name and email, excluding soft-deleted rows.
    @Query("""
            SELECT u FROM UserAccount u
            WHERE u.status <> com.bimap.iam.modules.user.domain.AccountStatus.DELETED
              AND (:term IS NULL
                   OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :term, '%'))
                   OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :term, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :term, '%')))
              AND (:status IS NULL OR u.status = :status)
            """)
    Page<UserAccount> search(@Param("term") String term, @Param("status") AccountStatus status, Pageable pageable);

    /// Accounts that never followed their activation link, for the nightly sweep.
    List<UserAccount> findByStatusAndCreatedAtBefore(AccountStatus status, Instant cutoff);

    long countByStatus(AccountStatus status);
}
