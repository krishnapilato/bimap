package com.bimap.business.modules.registry.domain;

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
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/// One protected asset, recorded against the place it stands in.
///
/// This is the whole business domain in one aggregate. It replaces the old pair of tables, where
/// `form` held what a surveyor submitted and `tables` held the protection details of the same
/// asset with no key joining them.
///
/// Geographic names are stored as text alongside the ISTAT code rather than as a foreign key:
/// the geography comes from an external API, and a record of what a place was called on the day
/// it was surveyed should not change underneath the surveyor when a comune is renamed or merged.
///
/// @author Khova Krishna Pilato
@Entity
@Table(
        name = "asset_registration",
        uniqueConstraints = @UniqueConstraint(name = "uk_asset_registration_public_id", columnNames = "public_id"),
        indexes = {
                @Index(name = "ix_asset_registration_istat", columnList = "istat_code"),
                @Index(name = "ix_asset_registration_region", columnList = "region"),
                @Index(name = "ix_asset_registration_province", columnList = "province_code"),
                @Index(name = "ix_asset_registration_status", columnList = "status"),
                @Index(name = "ix_asset_registration_author", columnList = "created_by")
        })
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, updatable = false, length = 36)
    @Builder.Default
    private String publicId = UUID.randomUUID().toString();

    // ── Where ────────────────────────────────────────────────────────────────

    @Column(nullable = false, length = 64)
    private String region;

    @Column(name = "province_name", nullable = false, length = 64)
    private String provinceName;

    @Column(name = "province_code", nullable = false, length = 4)
    private String provinceCode;

    @Column(nullable = false, length = 96)
    private String municipality;

    /// Six-digit ISTAT code, the stable identifier of the municipality.
    @Column(name = "istat_code", nullable = false, length = 6)
    private String istatCode;

    @Column(name = "cadastral_code", length = 4)
    private String cadastralCode;

    @Column(name = "postal_code", length = 5)
    private String postalCode;

    @Column(nullable = false, length = 256)
    private String address;

    @Column(name = "house_number", length = 16)
    private String houseNumber;

    @Column(length = 128)
    private String locality;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;

    // ── What ─────────────────────────────────────────────────────────────────

    @Column(name = "asset_name", nullable = false, length = 256)
    private String assetName;

    /// Internal identifier the surveyor carries in from the paper record.
    @Column(name = "asset_reference", length = 64)
    private String assetReference;

    /// Billing code of the public body responsible, from the national directory.
    @Column(name = "entity_billing_code", length = 16)
    private String entityBillingCode;

    @Column(name = "entity_name", length = 256)
    private String entityName;

    // ── Protection ───────────────────────────────────────────────────────────

    @Column(length = 128)
    private String ownership;

    @Column(name = "protection_measure", length = 256)
    private String protectionMeasure;

    @Column(name = "constraint_type", length = 128)
    private String constraintType;

    @Column(name = "cadastral_reference", length = 128)
    private String cadastralReference;

    @Column(length = 128)
    private String transcription;

    @Column(length = 2000)
    private String notes;

    // ── Lifecycle ────────────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private RegistrationStatus status = RegistrationStatus.DRAFT;

    @Column(name = "review_note", length = 512)
    private String reviewNote;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "reviewed_by", length = 254)
    private String reviewedBy;

    @CreatedBy
    @Column(name = "created_by", nullable = false, updatable = false, length = 254)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by", length = 254)
    private String updatedBy;

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

    /// Street and number as one line, which is how it reads on a table row or a CSV export.
    public String fullAddress() {
        return houseNumber == null || houseNumber.isBlank() ? address : address + " " + houseNumber;
    }

    public boolean isOwnedBy(String email) {
        return createdBy != null && createdBy.equalsIgnoreCase(email);
    }
}
