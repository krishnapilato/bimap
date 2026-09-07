package com.bimap.iam.modules.user.domain;

import java.util.EnumSet;
import java.util.Set;

/// Where an account sits in its lifecycle, and which moves are legal from there.
/// @author Khova Krishna Pilato
public enum AccountStatus {

    /// Registered, waiting for the activation link to be followed.
    PENDING_ACTIVATION,

    /// Activated and able to sign in.
    ACTIVE,

    /// Temporarily barred, by an administrator or by repeated failed sign-ins.
    LOCKED,

    /// Deactivated by an administrator; recoverable.
    DISABLED,

    /// Soft-deleted; the row is kept so registrations keep their author.
    DELETED;

    private static final Set<AccountStatus> SIGN_IN_ALLOWED = EnumSet.of(ACTIVE);

    public boolean canSignIn() {
        return SIGN_IN_ALLOWED.contains(this);
    }

    public boolean isTerminal() {
        return this == DELETED;
    }

    public Set<AccountStatus> allowedTransitions() {
        return switch (this) {
            case PENDING_ACTIVATION -> EnumSet.of(ACTIVE, DISABLED, DELETED);
            case ACTIVE -> EnumSet.of(LOCKED, DISABLED, DELETED);
            case LOCKED -> EnumSet.of(ACTIVE, DISABLED, DELETED);
            case DISABLED -> EnumSet.of(ACTIVE, DELETED);
            case DELETED -> EnumSet.noneOf(AccountStatus.class);
        };
    }

    public boolean canTransitionTo(AccountStatus target) {
        return allowedTransitions().contains(target);
    }
}
