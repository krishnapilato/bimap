package com.bimap.iam.bootstrap;

import com.bimap.iam.modules.user.domain.ApplicationRole;

/// One row of `seed/users.json`.
/// @author Khova Krishna Pilato
public record SeedUser(String firstName, String lastName, String email, ApplicationRole role) {

    public SeedUser {
        email = email == null ? null : email.strip().toLowerCase(java.util.Locale.ROOT);
        role = role == null ? ApplicationRole.USER : role;
    }
}
