package com.bimap.platform.security;

import com.bimap.platform.context.AuthenticatedUser;

import java.time.Instant;

/// The outcome of checking a token, as data rather than as an exception.
/// @author Khova Krishna Pilato
public sealed interface TokenVerification {

    /// Signature, issuer, type and expiry all check out.
    record Valid(AuthenticatedUser user, String tokenId, TokenType type, Instant expiresAt)
            implements TokenVerification {
    }

    /// Well-formed and correctly signed, but past its expiry.
    record Expired(Instant expiredAt) implements TokenVerification {
    }

    /// Unparseable, wrongly signed, from another issuer, or of the wrong type.
    record Invalid(String reason) implements TokenVerification {
    }
}
