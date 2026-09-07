package com.bimap.business.modules.registry.domain;

import java.util.EnumSet;
import java.util.Set;

/// How far a registration has travelled from a field note to an accepted record.
/// @author Khova Krishna Pilato
public enum RegistrationStatus {

    /// Saved in the field, still editable by its author.
    DRAFT,

    /// Handed over for review.
    SUBMITTED,

    /// Checked and accepted.
    VERIFIED,

    /// Sent back with a reason.
    REJECTED,

    /// Kept for the record, no longer part of the working set.
    ARCHIVED;

    public boolean isEditableByAuthor() {
        return this == DRAFT || this == REJECTED;
    }

    public Set<RegistrationStatus> allowedTransitions() {
        return switch (this) {
            case DRAFT -> EnumSet.of(SUBMITTED, ARCHIVED);
            case SUBMITTED -> EnumSet.of(VERIFIED, REJECTED, DRAFT);
            case REJECTED -> EnumSet.of(DRAFT, SUBMITTED, ARCHIVED);
            case VERIFIED -> EnumSet.of(ARCHIVED);
            case ARCHIVED -> EnumSet.noneOf(RegistrationStatus.class);
        };
    }

    public boolean canTransitionTo(RegistrationStatus target) {
        return allowedTransitions().contains(target);
    }
}
