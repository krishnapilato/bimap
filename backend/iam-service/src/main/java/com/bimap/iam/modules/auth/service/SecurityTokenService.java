package com.bimap.iam.modules.auth.service;

import com.bimap.iam.modules.auth.domain.SecurityToken;
import com.bimap.iam.modules.auth.repository.SecurityTokenRepository;
import com.bimap.iam.modules.user.domain.UserAccount;
import com.bimap.iam.modules.user.mapper.UserMapper;
import com.bimap.platform.error.AuthenticationFailedException;
import com.bimap.platform.error.ErrorCode;
import com.bimap.platform.security.IssuedToken;
import com.bimap.platform.security.JwtProperties;
import com.bimap.platform.security.JwtService;
import com.bimap.platform.security.TokenType;
import com.bimap.platform.security.TokenVerification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

/// Issues tokens and tracks them server-side so each one can be used once and revoked at will.
/// @author Khova Krishna Pilato
@Slf4j
@Service
@RequiredArgsConstructor
public class SecurityTokenService {

    private final SecurityTokenRepository tokens;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final UserMapper userMapper;
    private final SessionRevoker sessionRevoker;

    public IssuedToken issueAccessToken(UserAccount account) {
        return jwtService.issue(TokenType.ACCESS, userMapper.toPrincipal(account));
    }

    @Transactional
    public IssuedToken issueRefreshToken(UserAccount account, ClientFingerprint client) {
        var issued = jwtService.issue(TokenType.REFRESH, userMapper.toPrincipal(account));
        tokens.save(persist(issued, account, client));
        return issued;
    }

    @Transactional
    public IssuedToken issueSingleUseToken(UserAccount account, TokenType purpose) {
        var issued = jwtService.issue(purpose, account.getEmail(),
                Map.of("uid", account.getId(), "name", account.fullName()));
        tokens.save(persist(issued, account, ClientFingerprint.unknown()));
        return issued;
    }

    /// Exchanges a refresh token for a fresh pair, invalidating the one presented.
    ///
    /// A token that was already consumed means the same secret is in two places at once, so every
    /// refresh token the account holds is revoked and the session is ended.
    @Transactional
    public RefreshRotation rotateRefreshToken(String rawToken, ClientFingerprint client) {
        var stored = load(rawToken, TokenType.REFRESH);
        var account = stored.getUser();
        var email = account.getEmail();
        var now = Instant.now();

        if (stored.wasAlreadyUsed()) {
            // Committed independently, because the 401 below rolls this transaction back.
            var revoked = sessionRevoker.revokeAll(account.getId(), TokenType.REFRESH);
            log.warn("Refresh token reuse detected for {}, revoked {} outstanding token(s)", email, revoked);
            throw new AuthenticationFailedException(ErrorCode.TOKEN_INVALID,
                    "This refresh token was already used. All sessions have been ended for safety.");
        }
        if (!stored.isUsable(now)) {
            throw new AuthenticationFailedException(ErrorCode.TOKEN_EXPIRED,
                    "The refresh token is no longer valid. Sign in again.");
        }

        var replacement = jwtService.issue(TokenType.REFRESH, userMapper.toPrincipal(account));
        stored.consume(now);
        stored.setReplacedByTokenId(replacement.id());
        tokens.save(persist(replacement, account, client));

        return new RefreshRotation(account, replacement);
    }

    /// Reads and burns a single-use token, returning the account it belongs to.
    @Transactional
    public UserAccount consumeSingleUseToken(String rawToken, TokenType purpose) {
        var stored = load(rawToken, purpose);
        var now = Instant.now();

        if (!stored.isUsable(now)) {
            throw new AuthenticationFailedException(ErrorCode.TOKEN_EXPIRED,
                    "This link is no longer valid. Request a new one.");
        }
        stored.consume(now);
        return stored.getUser();
    }

    @Transactional
    public void revokeAll(UserAccount account, TokenType purpose) {
        tokens.revokeAllFor(account, purpose, Instant.now());
    }

    @Transactional
    public int purgeExpired(Instant cutoff) {
        return tokens.deleteExpiredBefore(cutoff);
    }

    public long refreshTokenTtlSeconds() {
        return jwtProperties.refreshTokenTtl().toSeconds();
    }

    private SecurityToken load(String rawToken, TokenType purpose) {
        var verification = jwtService.verify(rawToken, purpose);

        var tokenId = switch (verification) {
            case TokenVerification.Valid valid -> valid.tokenId();
            case TokenVerification.Expired expired -> throw new AuthenticationFailedException(
                    ErrorCode.TOKEN_EXPIRED, "This token expired at %s.".formatted(expired.expiredAt()));
            case TokenVerification.Invalid invalid -> throw new AuthenticationFailedException(
                    ErrorCode.TOKEN_INVALID, "This token could not be verified.");
        };

        return tokens.findByTokenIdAndPurpose(tokenId, purpose)
                .orElseThrow(() -> new AuthenticationFailedException(ErrorCode.TOKEN_INVALID,
                        "This token is not recognised."));
    }

    private static SecurityToken persist(IssuedToken issued, UserAccount account, ClientFingerprint client) {
        return SecurityToken.builder()
                .tokenId(issued.id())
                .purpose(issued.type())
                .user(account)
                .issuedAt(issued.issuedAt())
                .expiresAt(issued.expiresAt())
                .clientIp(client.ipAddress())
                .userAgent(client.userAgent())
                .build();
    }
}
