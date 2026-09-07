package com.bimap.platform.security;

import com.bimap.platform.context.AuthenticatedUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/// Issues and verifies every signed token in the platform.
/// @author Khova Krishna Pilato
@Slf4j
public class JwtService {

    static final String CLAIM_USER_ID = "uid";
    static final String CLAIM_DISPLAY_NAME = "name";
    static final String CLAIM_ROLE = "role";
    static final String CLAIM_AUTHORITIES = "authorities";
    static final String CLAIM_TENANT = "tenant";
    static final String CLAIM_TOKEN_TYPE = "typ";

    private final JwtProperties properties;
    private final SecretKey signingKey;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.signingKey = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
    }

    /// Signs an access or refresh token carrying the caller's full identity.
    public IssuedToken issue(TokenType type, AuthenticatedUser user) {
        var claims = new LinkedHashMap<String, Object>();
        claims.put(CLAIM_USER_ID, user.id());
        claims.put(CLAIM_DISPLAY_NAME, user.displayName());
        claims.put(CLAIM_ROLE, user.role());
        claims.put(CLAIM_AUTHORITIES, List.copyOf(user.authorities()));
        if (user.tenant() != null) {
            claims.put(CLAIM_TENANT, user.tenant());
        }
        return sign(type, user.email(), claims, properties.ttlFor(type));
    }

    /// Signs a single-purpose token, such as the one embedded in an activation link.
    public IssuedToken issue(TokenType type, String subject, Map<String, Object> extraClaims) {
        return sign(type, subject, extraClaims, properties.ttlFor(type));
    }

    private IssuedToken sign(TokenType type, String subject, Map<String, Object> claims, Duration ttl) {
        var tokenId = UUID.randomUUID().toString();
        var issuedAt = Instant.now();
        var expiresAt = issuedAt.plus(ttl);

        var value = Jwts.builder()
                .id(tokenId)
                .issuer(properties.issuer())
                .subject(subject)
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .claims(claims)
                .claim(CLAIM_TOKEN_TYPE, type.claimValue())
                .signWith(signingKey, Jwts.SIG.HS512)
                .compact();

        return new IssuedToken(tokenId, value, type, issuedAt, expiresAt);
    }

    /// Verifies signature, issuer, expiry and intended purpose in one pass.
    public TokenVerification verify(String token, TokenType expectedType) {
        if (token == null || token.isBlank()) {
            return new TokenVerification.Invalid("no token supplied");
        }
        try {
            var claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .requireIssuer(properties.issuer())
                    .clockSkewSeconds(properties.clockSkew().toSeconds())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            var actualType = claims.get(CLAIM_TOKEN_TYPE, String.class);
            if (!expectedType.claimValue().equals(actualType)) {
                return new TokenVerification.Invalid(
                        "expected a %s token but received %s".formatted(expectedType.claimValue(), actualType));
            }

            return new TokenVerification.Valid(toPrincipal(claims), claims.getId(), expectedType,
                    claims.getExpiration().toInstant());

        } catch (ExpiredJwtException expired) {
            return new TokenVerification.Expired(expired.getClaims().getExpiration().toInstant());
        } catch (JwtException | IllegalArgumentException rejected) {
            log.debug("Rejected token: {}", rejected.getMessage());
            return new TokenVerification.Invalid(rejected.getMessage());
        }
    }

    /// Reads the subject of a single-purpose token, or fails with the reason it was rejected.
    public String subjectOf(String token, TokenType expectedType) {
        return switch (verify(token, expectedType)) {
            case TokenVerification.Valid valid -> valid.user().email();
            case TokenVerification.Expired expired ->
                    throw new IllegalStateException("Token expired at " + expired.expiredAt());
            case TokenVerification.Invalid invalid -> throw new IllegalStateException(invalid.reason());
        };
    }

    private AuthenticatedUser toPrincipal(Claims claims) {
        var authorities = claims.get(CLAIM_AUTHORITIES, List.class);

        @SuppressWarnings("unchecked")
        Set<String> granted = authorities == null
                ? Set.of()
                : Set.copyOf((List<String>) authorities);

        return new AuthenticatedUser(
                claims.get(CLAIM_USER_ID, Number.class) instanceof Number id ? id.longValue() : null,
                claims.getSubject(),
                claims.get(CLAIM_DISPLAY_NAME, String.class),
                claims.get(CLAIM_ROLE, String.class),
                granted,
                claims.get(CLAIM_TENANT, String.class));
    }
}
