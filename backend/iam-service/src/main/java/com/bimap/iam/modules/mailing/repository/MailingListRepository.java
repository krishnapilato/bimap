package com.bimap.iam.modules.mailing.repository;

import com.bimap.iam.modules.mailing.domain.MailingList;
import com.bimap.iam.modules.mailing.domain.MailingListStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/// @author Khova Krishna Pilato
public interface MailingListRepository extends JpaRepository<MailingList, Long> {

    Optional<MailingList> findByPublicId(String publicId);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    long countByStatus(MailingListStatus status);

    /// Free text over name and description, optionally narrowed by status.
    @Query("""
            SELECT l FROM MailingList l
            WHERE (:term IS NULL
                   OR LOWER(l.name) LIKE LOWER(CONCAT('%', :term, '%'))
                   OR LOWER(l.description) LIKE LOWER(CONCAT('%', :term, '%')))
              AND (:status IS NULL OR l.status = :status)
            """)
    Page<MailingList> search(@Param("term") String term,
                             @Param("status") MailingListStatus status,
                             Pageable pageable);
}
