package com.bimap.platform.security;

import com.bimap.platform.context.AuthenticatedUser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.InstanceOfAssertFactories.type;

/// @author Khova Krishna Pilato
class JwtServiceTest {

    private static final String SECRET =
            "a-test-signing-key-that-is-comfortably-longer-than-sixty-four-characters";

    private final JwtProperties properties = new JwtProperties(SECRET, "bimap",
            Duration.ofMinutes(15), Duration.ofDays(30), Duration.ofHours(48),
            Duration.ofHours(1), Duration.ofSeconds(30));

    private final JwtService jwtService = new JwtService(properties);

    private static AuthenticatedUser caller() {
        return new AuthenticatedUser(42L, "mario.rossi@example.com", "Mario Rossi",
                "MANAGER", Set.of("registration:read", "registration:read-all"), null);
    }

    @Nested
    @DisplayName("a freshly issued access token")
    class FreshAccessToken {

        private final IssuedToken token = jwtService.issue(TokenType.ACCESS, caller());

        @Test
        @DisplayName("verifies, and carries the whole caller back")
        void roundTripsTheCaller() {
            var verification = jwtService.verify(token.value(), TokenType.ACCESS);

            assertThat(verification)
                    .asInstanceOf(type(TokenVerification.Valid.class))
                    .satisfies(valid -> {
                        assertThat(valid.user().id()).isEqualTo(42L);
                        assertThat(valid.user().email()).isEqualTo("mario.rossi@example.com");
                        assertThat(valid.user().displayName()).isEqualTo("Mario Rossi");
                        assertThat(valid.user().role()).isEqualTo("MANAGER");
                        assertThat(valid.user().authorities())
                                .containsExactlyInAnyOrder("registration:read", "registration:read-all");
                        assertThat(valid.tokenId()).isEqualTo(token.id());
                    });
        }

        @Test
        @DisplayName("is rejected when presented as a refresh token")
        void refusesTokenTypeConfusion() {
            assertThat(jwtService.verify(token.value(), TokenType.REFRESH))
                    .asInstanceOf(type(TokenVerification.Invalid.class))
                    .satisfies(invalid -> assertThat(invalid.reason()).contains("refresh"));
        }

        @Test
        @DisplayName("expires in the future")
        void expiresLater() {
            assertThat(token.expiresAt()).isAfter(token.issuedAt());
            assertThat(token.expiresInSeconds()).isBetween(1L, Duration.ofMinutes(15).toSeconds());
        }
    }

    @Test
    @DisplayName("a token signed with another key is rejected")
    void refusesAForeignSignature() {
        var otherIssuer = new JwtService(new JwtProperties(
                "a-completely-different-signing-key-also-longer-than-sixty-four-chars", "bimap",
                Duration.ofMinutes(15), Duration.ofDays(30), Duration.ofHours(48),
                Duration.ofHours(1), Duration.ofSeconds(30)));

        var foreign = otherIssuer.issue(TokenType.ACCESS, caller());

        assertThat(jwtService.verify(foreign.value(), TokenType.ACCESS))
                .isInstanceOf(TokenVerification.Invalid.class);
    }

    @Test
    @DisplayName("a token from another issuer is rejected")
    void refusesAForeignIssuer() {
        var otherIssuer = new JwtService(new JwtProperties(SECRET, "somebody-else",
                Duration.ofMinutes(15), Duration.ofDays(30), Duration.ofHours(48),
                Duration.ofHours(1), Duration.ofSeconds(30)));

        var foreign = otherIssuer.issue(TokenType.ACCESS, caller());

        assertThat(jwtService.verify(foreign.value(), TokenType.ACCESS))
                .isInstanceOf(TokenVerification.Invalid.class);
    }

    @Test
    @DisplayName("an already expired token reports when it expired, not that it is malformed")
    void reportsExpiryDistinctly() {
        var shortLived = new JwtService(new JwtProperties(SECRET, "bimap",
                Duration.ofSeconds(-60), Duration.ofDays(30), Duration.ofHours(48),
                Duration.ofHours(1), Duration.ZERO));

        var stale = shortLived.issue(TokenType.ACCESS, caller());

        assertThat(shortLived.verify(stale.value(), TokenType.ACCESS))
                .isInstanceOf(TokenVerification.Expired.class);
    }

    @Test
    @DisplayName("garbage in the Authorization header is rejected, not thrown")
    void refusesGarbage() {
        assertThat(jwtService.verify("not-a-token", TokenType.ACCESS))
                .isInstanceOf(TokenVerification.Invalid.class);
        assertThat(jwtService.verify(null, TokenType.ACCESS))
                .isInstanceOf(TokenVerification.Invalid.class);
        assertThat(jwtService.verify("  ", TokenType.ACCESS))
                .isInstanceOf(TokenVerification.Invalid.class);
    }

    @Test
    @DisplayName("single-use tokens carry their subject")
    void issuesSingleUseTokens() {
        var activation = jwtService.issue(TokenType.ACTIVATION, "nuovo@example.com", java.util.Map.of("uid", 7L));

        assertThat(jwtService.subjectOf(activation.value(), TokenType.ACTIVATION))
                .isEqualTo("nuovo@example.com");
    }
}
