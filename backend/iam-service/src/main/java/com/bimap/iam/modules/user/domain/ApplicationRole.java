package com.bimap.iam.modules.user.domain;

import java.util.Set;

/// What a signed-in account is allowed to do.
/// @author Khova Krishna Pilato
public enum ApplicationRole {

    /// Registers assets and reads back their own submissions.
    USER(Set.of(Permission.REGISTRATION_READ, Permission.REGISTRATION_WRITE)),

    /// Everything a user can do, plus oversight of every submission and export.
    MANAGER(Set.of(Permission.REGISTRATION_READ, Permission.REGISTRATION_WRITE,
            Permission.REGISTRATION_READ_ALL, Permission.REGISTRATION_EXPORT, Permission.USER_READ)),

    /// Full control, including the user lifecycle.
    ADMINISTRATOR(Set.of(Permission.values()));

    private final Set<Permission> permissions;

    ApplicationRole(Set<Permission> permissions) {
        this.permissions = Set.copyOf(permissions);
    }

    public Set<Permission> permissions() {
        return permissions;
    }

    public Set<String> authorities() {
        return permissions.stream().map(Permission::authority).collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    public boolean isAtLeast(ApplicationRole other) {
        return ordinal() >= other.ordinal();
    }
}
