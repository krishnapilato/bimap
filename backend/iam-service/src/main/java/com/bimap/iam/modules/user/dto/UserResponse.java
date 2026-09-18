package com.bimap.iam.modules.user.dto;

import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.domain.ApplicationRole;
import com.bimap.iam.modules.user.domain.AuthProvider;

import java.time.Instant;
import java.util.Set;

/// The shape of a user on the wire. Never carries the password hash.
///
/// @param passwordSet False for an invited account that has not chosen a password yet, and for
///                    accounts that only ever sign in with Google.
/// @author Khova Krishna Pilato
public record UserResponse(
        String id,
        String firstName,
        String lastName,
        String fullName,
        String email,
        AccountStatus status,
        ApplicationRole role,
        AuthProvider authProvider,
        boolean passwordSet,
        Set<String> permissions,
        String avatarUrl,
        String locale,
        Instant lastLoginAt,
        Instant createdAt,
        Instant updatedAt) {
}
