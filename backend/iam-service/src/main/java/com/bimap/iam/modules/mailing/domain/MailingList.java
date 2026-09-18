package com.bimap.iam.modules.mailing.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/// A named audience that people join, and campaigns are sent to.
/// @author Khova Krishna Pilato
@Entity
@Table(
        name = "mailing_list",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_mailing_list_public_id", columnNames = "public_id"),
                @UniqueConstraint(name = "uk_mailing_list_name", columnNames = "name")
        },
        indexes = @Index(name = "ix_mailing_list_status", columnList = "status"))
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MailingList {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, updatable = false, length = 36)
    @Builder.Default
    private String publicId = UUID.randomUUID().toString();

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 500)
    private String description;

    /// Whether a new address has to confirm itself before it receives anything.
    @Column(name = "double_opt_in", nullable = false)
    @Builder.Default
    private boolean doubleOptIn = true;

    /// Whether the public subscription page accepts sign-ups for this list.
    @Column(name = "public_signup", nullable = false)
    private boolean publicSignup;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private MailingListStatus status = MailingListStatus.ACTIVE;

    @CreatedBy
    @Column(name = "created_by", nullable = false, updatable = false, length = 254)
    private String createdBy;

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

    public boolean isActive() {
        return status == MailingListStatus.ACTIVE;
    }

    public boolean acceptsPublicSignups() {
        return isActive() && publicSignup;
    }
}
