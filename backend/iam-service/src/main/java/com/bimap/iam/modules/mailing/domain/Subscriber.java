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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/// One address on one list, with the record of how and when it consented.
/// @author Khova Krishna Pilato
@Entity
@Table(
        name = "list_subscriber",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_list_subscriber_public_id", columnNames = "public_id"),
                @UniqueConstraint(name = "uk_list_subscriber_list_email", columnNames = {"list_id", "email"})
        },
        indexes = {
                @Index(name = "ix_list_subscriber_list_status", columnList = "list_id, status"),
                @Index(name = "ix_list_subscriber_email", columnList = "email"),
                @Index(name = "ix_list_subscriber_subscribed_at", columnList = "subscribed_at")
        })
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subscriber {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, updatable = false, length = 36)
    @Builder.Default
    private String publicId = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "list_id", nullable = false, foreignKey = @ForeignKey(name = "fk_list_subscriber_list"))
    private MailingList list;

    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "first_name", length = 80)
    private String firstName;

    @Column(name = "last_name", length = 80)
    private String lastName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SubscriptionSource source;

    /// Address the consent was given from, when it was given through a browser.
    @Column(name = "consent_ip", length = 45)
    private String consentIp;

    @Column(name = "subscribed_at")
    private Instant subscribedAt;

    @Column(name = "unsubscribed_at")
    private Instant unsubscribedAt;

    @Column(name = "unsubscribe_reason", length = 256)
    private String unsubscribeReason;

    @Column(name = "confirmation_sent_at")
    private Instant confirmationSentAt;

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

    public String fullName() {
        return "%s %s".formatted(nullToEmpty(firstName), nullToEmpty(lastName)).strip();
    }

    /// The owner of the address said yes, which also clears any earlier opt-out.
    public void confirm(Instant now) {
        status = SubscriptionStatus.SUBSCRIBED;
        subscribedAt = now;
        unsubscribedAt = null;
        unsubscribeReason = null;
    }

    /// Opting out twice keeps the first date and reason: that is when consent was withdrawn.
    public void unsubscribe(String reason, Instant now) {
        if (status == SubscriptionStatus.UNSUBSCRIBED) {
            return;
        }
        status = SubscriptionStatus.UNSUBSCRIBED;
        unsubscribedAt = now;
        unsubscribeReason = reason;
    }

    /// Back to waiting on the owner, for an address that has to prove itself again.
    public void awaitConfirmation() {
        status = SubscriptionStatus.PENDING;
        unsubscribedAt = null;
        unsubscribeReason = null;
    }

    /// Takes whichever names are given, and reports whether that changed anything.
    public boolean adoptNames(String first, String last) {
        var changed = false;
        if (first != null && !first.equals(firstName)) {
            firstName = first;
            changed = true;
        }
        if (last != null && !last.equals(lastName)) {
            lastName = last;
            changed = true;
        }
        return changed;
    }

    public boolean confirmationSentWithin(Duration cooldown, Instant now) {
        return confirmationSentAt != null && confirmationSentAt.plus(cooldown).isAfter(now);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
