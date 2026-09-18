package com.bimap.iam.modules.notification.repository;

import com.bimap.iam.modules.notification.domain.DeliveryStatus;
import com.bimap.iam.modules.notification.domain.SentEmail;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
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

    boolean existsByCampaignIdAndTemplateAndRecipientIgnoreCase(String campaignId, String template, String recipient);

    /// One campaign's messages, newest first, optionally narrowed by outcome.
    @Query("""
            SELECT e FROM SentEmail e
            WHERE e.campaignId = :campaignId
              AND e.template = :template
              AND (:status IS NULL OR e.status = :status)
            ORDER BY e.sentAt DESC
            """)
    Page<SentEmail> campaignDeliveries(@Param("campaignId") String campaignId,
                                       @Param("template") String template,
                                       @Param("status") DeliveryStatus status,
                                       Pageable pageable);

    /// `[status, count]` for one campaign's messages.
    @Query("""
            SELECT e.status, COUNT(e) FROM SentEmail e
            WHERE e.campaignId = :campaignId AND e.template = :template
            GROUP BY e.status
            """)
    List<Object[]> countCampaignDeliveries(@Param("campaignId") String campaignId,
                                           @Param("template") String template);

    /// `[campaignId, status, count]` for several campaigns at once.
    @Query("""
            SELECT e.campaignId, e.status, COUNT(e) FROM SentEmail e
            WHERE e.campaignId IN :campaignIds AND e.template = :template
            GROUP BY e.campaignId, e.status
            """)
    List<Object[]> countCampaignDeliveries(@Param("campaignIds") Collection<String> campaignIds,
                                           @Param("template") String template);

    /// `[status, count]` for every message of one template sent since `since`.
    @Query("""
            SELECT e.status, COUNT(e) FROM SentEmail e
            WHERE e.template = :template AND e.sentAt >= :since
            GROUP BY e.status
            """)
    List<Object[]> countTemplateDeliveriesSince(@Param("template") String template,
                                                @Param("since") Instant since);
}
