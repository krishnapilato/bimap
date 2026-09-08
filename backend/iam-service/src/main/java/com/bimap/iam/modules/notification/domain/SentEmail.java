package com.bimap.iam.modules.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/// The delivery log: one row per message the platform tried to send.
///
/// Written for every transactional email as well as every ad-hoc one, because "did the activation
/// mail actually go out?" is the first question asked when somebody cannot sign in, and an SMTP
/// relay's own logs are rarely to hand.
///
/// The body is kept so the row can be re-read, but attachment *content* never is — filenames and
/// sizes are enough to explain a delivery, and storing the payload would turn a log table into a
/// file store.
///
/// @author Khova Krishna Pilato
@Entity
@Table(
        name = "sent_email",
        indexes = {
                @Index(name = "ix_sent_email_sent_at", columnList = "sent_at"),
                @Index(name = "ix_sent_email_recipient", columnList = "recipient"),
                @Index(name = "ix_sent_email_status", columnList = "status")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SentEmail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, updatable = false, length = 36)
    private String publicId;

    @Column(nullable = false, length = 320)
    private String recipient;

    @Column(nullable = false, length = 255)
    private String subject;

    /// The enum name for a transactional message, null for one composed by hand.
    @Column(length = 40)
    private String template;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private MailFormat format;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private DeliveryStatus status;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String body;

    /// Filenames and sizes only, comma-separated. Never the bytes.
    @Column(name = "attachment_summary", length = 1024)
    private String attachmentSummary;

    @Column(name = "failure_reason", length = 512)
    private String failureReason;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt;
}
