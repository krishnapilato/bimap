package com.bimap.iam.modules.mailing.repository;

import com.bimap.iam.modules.mailing.domain.MailingList;
import com.bimap.iam.modules.mailing.domain.Subscriber;
import com.bimap.iam.modules.mailing.domain.SubscriptionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/// @author Khova Krishna Pilato
public interface SubscriberRepository extends JpaRepository<Subscriber, Long> {

    /// The list is read on every public link, so it arrives in the same query.
    @EntityGraph(attributePaths = "list")
    Optional<Subscriber> findByPublicId(String publicId);

    Optional<Subscriber> findByListAndPublicId(MailingList list, String publicId);

    Optional<Subscriber> findByListAndEmailIgnoreCase(MailingList list, String email);

    List<Subscriber> findByListAndEmailIn(MailingList list, Collection<String> emails);

    long countByListAndStatus(MailingList list, SubscriptionStatus status);

    /// Free text over address and name, optionally narrowed by status.
    @Query("""
            SELECT s FROM Subscriber s
            WHERE s.list = :list
              AND (:term IS NULL
                   OR LOWER(s.email) LIKE LOWER(CONCAT('%', :term, '%'))
                   OR LOWER(s.firstName) LIKE LOWER(CONCAT('%', :term, '%'))
                   OR LOWER(s.lastName) LIKE LOWER(CONCAT('%', :term, '%')))
              AND (:status IS NULL OR s.status = :status)
            """)
    Page<Subscriber> search(@Param("list") MailingList list,
                            @Param("term") String term,
                            @Param("status") SubscriptionStatus status,
                            Pageable pageable);

    /// Recipients after a given id, so a long send pages stably while people keep joining.
    List<Subscriber> findByListAndStatusAndIdGreaterThanOrderByIdAsc(
            MailingList list, SubscriptionStatus status, Long afterId, Pageable pageable);

    /// Everyone on a list in the order they joined, for the export.
    @Query("""
            SELECT s FROM Subscriber s
            WHERE s.list = :list AND (:status IS NULL OR s.status = :status)
            ORDER BY s.createdAt ASC, s.id ASC
            """)
    List<Subscriber> exportable(@Param("list") MailingList list, @Param("status") SubscriptionStatus status);

    @Query("""
            SELECT new com.bimap.iam.modules.mailing.repository.StatusCount(s.list.id, s.status, COUNT(s))
            FROM Subscriber s
            WHERE s.list.id IN :listIds
            GROUP BY s.list.id, s.status
            """)
    List<StatusCount> countByStatusForLists(@Param("listIds") Collection<Long> listIds);

    @Query("""
            SELECT new com.bimap.iam.modules.mailing.repository.StatusCount(0L, s.status, COUNT(s))
            FROM Subscriber s
            GROUP BY s.status
            """)
    List<StatusCount> countByStatus();

    @Query("""
            SELECT COUNT(DISTINCT s.email) FROM Subscriber s
            WHERE s.status = com.bimap.iam.modules.mailing.domain.SubscriptionStatus.SUBSCRIBED
            """)
    long countDistinctSubscribedAddresses();

    /// Confirmations per UTC day since `since`, for one list or all of them.
    @Query(value = """
            SELECT DATE(subscribed_at) AS day, COUNT(*) AS total
            FROM list_subscriber
            WHERE subscribed_at >= :since AND (:listId IS NULL OR list_id = :listId)
            GROUP BY DATE(subscribed_at)
            """, nativeQuery = true)
    List<Object[]> subscriptionsPerDay(@Param("since") Instant since, @Param("listId") Long listId);

    /// Opt-outs per UTC day since `since`, for one list or all of them.
    @Query(value = """
            SELECT DATE(unsubscribed_at) AS day, COUNT(*) AS total
            FROM list_subscriber
            WHERE unsubscribed_at >= :since AND (:listId IS NULL OR list_id = :listId)
            GROUP BY DATE(unsubscribed_at)
            """, nativeQuery = true)
    List<Object[]> unsubscriptionsPerDay(@Param("since") Instant since, @Param("listId") Long listId);
}
