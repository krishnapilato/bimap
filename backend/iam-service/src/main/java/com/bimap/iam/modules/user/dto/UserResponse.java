package com.bimap.iam.modules.user.dto;

import com.bimap.iam.modules.user.domain.AccountStatus;
import com.bimap.iam.modules.user.domain.ApplicationRole;
import com.bimap.iam.modules.user.domain.AuthProvider;

import java.time.Instant;
import java.util.Set;

/// The shape of a user on the wire. Never carries the password hash.
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
        Set<String> permissions,
        String avatarUrl,
        String locale,
        Instant lastLoginAt,
        Instant createdAt,
        Instant updatedAt) {
}
