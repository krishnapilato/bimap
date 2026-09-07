package com.bimap.platform.context;

import java.time.Instant;
import java.util.Optional;

/// Everything ambient about one HTTP request: who is calling, and the correlation id that stitches its log lines together across both services.
/// @author Khova Krishna Pilato
public record RequestContext(String correlationId, Instant receivedAt, AuthenticatedUser user) {

    public static RequestContext anonymous(String correlationId) {
        return new RequestContext(correlationId, Instant.now(), null);
    }

    public RequestContext withUser(AuthenticatedUser authenticated) {
        return new RequestContext(correlationId, receivedAt, authenticated);
    }

    public Optional<AuthenticatedUser> maybeUser() {
        return Optional.ofNullable(user);
    }

    public boolean isAuthenticated() {
        return user != null;
    }
}
