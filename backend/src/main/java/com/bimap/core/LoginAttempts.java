package com.bimap.core;

import module java.base;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.ErrorResponseException;

@Component
public class LoginAttempts {

    private static final int MAX_ATTEMPTS = 10;
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int MAX_TRACKED_CLIENTS = 10_000;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    private record Window(Instant start, int attempts) {

        boolean expired(Instant now) {
            return start.plus(WINDOW).isBefore(now);
        }
    }

    public void check(String client) {
        var now = Instant.now();
        var window = windows.get(client);
        if (window == null || window.expired(now) || window.attempts() < MAX_ATTEMPTS) return;

        var blocked = new ErrorResponseException(HttpStatus.TOO_MANY_REQUESTS);
        blocked.setDetail("Too many sign-in attempts. Try again later.");
        blocked.getHeaders().set(HttpHeaders.RETRY_AFTER, String.valueOf(Duration.between(now, window.start().plus(WINDOW)).toSeconds() + 1));
        throw blocked;
    }

    public void recordAttempt(String client) {
        var now = Instant.now();
        windows.compute(client, (_, window) -> window == null || window.expired(now) ? new Window(now, 1) : new Window(window.start(), window.attempts() + 1));
        if (windows.size() > MAX_TRACKED_CLIENTS) windows.values().removeIf(window -> window.expired(now));
    }
}
