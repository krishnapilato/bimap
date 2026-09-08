package com.bimap.iam.modules.notification.repository;

import com.bimap.iam.modules.notification.domain.DeliveryStatus;
import com.bimap.iam.modules.notification.domain.SentEmail;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/// @author Khova Krishna Pilato
public interface SentEmailRepository extends JpaRepository<SentEmail, Long> {

    Optional<SentEmail> findByPublicId(String publicId);

    /// Newest first, optionally narrowed by recipient or by outcome.
    @Query("""
            SELECT e FROM SentEmail e
            WHERE (:recipient IS NULL OR LOWER(e.recipient) LIKE LOWER(CONCAT('%', :recipient, '%')))
              AND (:status IS NULL OR e.status = :status)
            ORDER BY e.sentAt DESC
            """)
    Page<SentEmail> search(@Param("recipient") String recipient,
                           @Param("status") DeliveryStatus status,
                           Pageable pageable);

    long countByStatus(DeliveryStatus status);
}
