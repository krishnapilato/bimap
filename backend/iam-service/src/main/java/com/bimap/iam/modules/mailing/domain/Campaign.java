package com.bimap.iam.modules.mailing.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
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

/// One message written once and sent to everyone subscribed to a list.
/// @author Khova Krishna Pilato
@Entity
@Table(
        name = "mail_campaign",
        uniqueConstraints = @UniqueConstraint(name = "uk_mail_campaign_public_id", columnNames = "public_id"),
        indexes = {
                @Index(name = "ix_mail_campaign_list_status", columnList = "list_id, status"),
                @Index(name = "ix_mail_campaign_due", columnList = "status, scheduled_at")
        })
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Campaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, updatable = false, length = 36)
    @Builder.Default
    private String publicId = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "list_id", nullable = false, foreignKey = @ForeignKey(name = "fk_mail_campaign_list"))
    private MailingList list;

    @Column(nullable = false, length = 255)
    private String subject;

    /// The preview line an inbox shows next to the subject.
    @Column(length = 255)
    private String preheader;

    @Lob
    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private CampaignStatus status = CampaignStatus.DRAFT;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    /// How many subscribers the campaign was addressed to when sending began.
    @Column(name = "recipient_count", nullable = false)
    private int recipientCount;

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

    public void schedule(Instant sendAt) {
        status = CampaignStatus.SCHEDULED;
        scheduledAt = sendAt;
    }

    public void unschedule() {
        status = CampaignStatus.DRAFT;
        scheduledAt = null;
    }

    /// A fresh draft with the same content, for sending again after this one has finished.
    public Campaign duplicate() {
        return Campaign.builder()
                .list(list)
                .subject(subject)
                .preheader(preheader)
                .body(body)
                .build();
    }
}
