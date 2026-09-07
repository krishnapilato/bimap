package com.bimap.platform.security;

import java.time.Instant;

/// A token that has just been signed, together with the facts a caller needs to store it.
/// @author Khova Krishna Pilato
public record IssuedToken(String id, String value, TokenType type, Instant issuedAt, Instant expiresAt) {

    /// Seconds remaining, which is what OAuth-style clients expect in `expires_in`.
    public long expiresInSeconds() {
        return Math.max(0, expiresAt.getEpochSecond() - Instant.now().getEpochSecond());
    }
}
