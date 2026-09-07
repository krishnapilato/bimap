package com.bimap.platform.context;

import java.util.Set;

/// The caller behind the current request, reconstructed from a verified access token.
/// @author Khova Krishna Pilato
public record AuthenticatedUser(
        Long id,
        String email,
        String displayName,
        String role,
        Set<String> authorities,
        String tenant) {

    public AuthenticatedUser {
        authorities = authorities == null ? Set.of() : Set.copyOf(authorities);
    }

    /// True when the caller holds `role`, compared without the `ROLE_` prefix.
    public boolean hasRole(String candidate) {
        return role != null && role.equalsIgnoreCase(candidate);
    }

    public boolean hasAuthority(String authority) {
        return authorities.contains(authority);
    }
}
