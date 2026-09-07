package com.bimap.iam.modules.auth.service;

import com.bimap.iam.modules.auth.repository.SecurityTokenRepository;
import com.bimap.platform.security.TokenType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/// Ends every session of one account, in a transaction of its own.
///
/// The separate transaction is the whole point. Reuse of a refresh token is detected on a request
/// that then fails with a 401, and a 401 rolls its transaction back. Revoking in that same
/// transaction would undo the revocation along with it, leaving a known-stolen token working:
/// the check would report the theft and do nothing about it.
///
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
public class SessionRevoker {

    private final SecurityTokenRepository tokens;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int revokeAll(Long userId, TokenType purpose) {
        var revoked = tokens.revokeAllForUser(userId, purpose, Instant.now());
        log.debug("Revoked {} {} token(s) for account {}", revoked, purpose, userId);
        return revoked;
    }
}
