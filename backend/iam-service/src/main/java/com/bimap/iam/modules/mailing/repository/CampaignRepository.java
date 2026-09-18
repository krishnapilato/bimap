package com.bimap.iam.modules.mailing.repository;

import com.bimap.iam.modules.mailing.domain.Campaign;
import com.bimap.iam.modules.mailing.domain.CampaignStatus;
import com.bimap.iam.modules.mailing.domain.MailingList;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/// @author Khova Krishna Pilato
public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    Optional<Campaign> findByListAndPublicId(MailingList list, String publicId);

    /// The delivery worker runs outside any transaction, so the list has to arrive loaded.
    @EntityGraph(attributePaths = "list")
    Optional<Campaign> findWithListById(Long id);

    @Query("""
            SELECT c FROM Campaign c
            WHERE c.list = :list AND (:status IS NULL OR c.status = :status)
            """)
    Page<Campaign> search(@Param("list") MailingList list,
                          @Param("status") CampaignStatus status,
                          Pageable pageable);

    List<Campaign> findByListAndStatus(MailingList list, CampaignStatus status);

    boolean existsByListAndStatus(MailingList list, CampaignStatus status);

    long countByStatus(CampaignStatus status);

    @Query("SELECT c.status FROM Campaign c WHERE c.id = :id")
    Optional<CampaignStatus> statusOf(@Param("id") Long id);

    /// `[listId, campaigns, when the last one finished sending]` for each of the given lists.
    @Query("""
            SELECT c.list.id, COUNT(c),
                   MAX(CASE WHEN c.status = com.bimap.iam.modules.mailing.domain.CampaignStatus.SENT
                            THEN c.completedAt END)
            FROM Campaign c
            WHERE c.list.id IN :listIds
            GROUP BY c.list.id
            """)
    List<Object[]> summariseLists(@Param("listIds") Collection<Long> listIds);

    @Query("""
            SELECT c.id FROM Campaign c
            WHERE c.status = com.bimap.iam.modules.mailing.domain.CampaignStatus.SCHEDULED
              AND c.scheduledAt <= :now
            ORDER BY c.scheduledAt ASC
            """)
    List<Long> findDueIds(@Param("now") Instant now);

    @Query("SELECT c.id FROM Campaign c WHERE c.status = :status")
    List<Long> findIdsByStatus(@Param("status") CampaignStatus status);

    /// Moves a draft or scheduled campaign to SENDING, and reports whether this caller won the race.
    @Transactional
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE Campaign c
               SET c.status = com.bimap.iam.modules.mailing.domain.CampaignStatus.SENDING,
                   c.startedAt = :now,
                   c.recipientCount = :recipients,
                   c.version = c.version + 1
             WHERE c.id = :id
               AND c.status IN (com.bimap.iam.modules.mailing.domain.CampaignStatus.DRAFT,
                                com.bimap.iam.modules.mailing.domain.CampaignStatus.SCHEDULED)
            """)
    int claimForSending(@Param("id") Long id, @Param("recipients") int recipients, @Param("now") Instant now);

    /// Ends a send, but only one that is still running: a cancellation that got there first wins.
    @Transactional
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            UPDATE Campaign c
               SET c.status = :outcome,
                   c.completedAt = :now,
                   c.version = c.version + 1
             WHERE c.id = :id
               AND c.status = com.bimap.iam.modules.mailing.domain.CampaignStatus.SENDING
            """)
    int finish(@Param("id") Long id, @Param("outcome") CampaignStatus outcome, @Param("now") Instant now);
}
