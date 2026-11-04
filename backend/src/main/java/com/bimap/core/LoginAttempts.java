package com.bimap.core;

import module java.base;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.ErrorResponseException;

@Component
public class LoginAttempts {

    private static final int MAX_ATTEMPTS = 10;
    private static final Duration WINDOW = Duration.ofMinutes(15);
    private static final int MAX_TRACKED_CLIENTS = 10_000;

    private final SequencedMap<String, Window> windows = new LinkedHashMap<>();
    private final Clock clock;

    @Autowired
    public LoginAttempts() {
        this(Clock.systemUTC());
    }

    LoginAttempts(Clock clock) {
        this.clock = clock;
    }

    private static final class Window {
        private final Instant start;
        private int attempts;

        private Window(Instant start) {
            this.start = start;
        }
    }

    public final class Attempt {
        private final Window window;
        private boolean completed;

        private Attempt(Window window) {
            this.window = window;
        }

        public void succeeded() {
            synchronized (LoginAttempts.this) {
                if (!completed) {
                    window.attempts--;
                    completed = true;
                }
            }
        }
    }

    public synchronized Attempt reserve(String client) {
        var now = clock.instant();
        while (!windows.isEmpty() && !windows.firstEntry().getValue().start.plus(WINDOW).isAfter(now)) {
            windows.pollFirstEntry();
        }

        var window = windows.get(client);
        if (window == null) {
            // Keep existing limits intact rather than evicting clients under load.
            if (windows.size() >= MAX_TRACKED_CLIENTS) throw blocked(now, windows.firstEntry().getValue().start);
            window = new Window(now);
            windows.put(client, window);
        }
        if (window.attempts >= MAX_ATTEMPTS) throw blocked(now, window.start);
        window.attempts++;
        return new Attempt(window);
    }

    private static ErrorResponseException blocked(Instant now, Instant start) {
        var blocked = new ErrorResponseException(HttpStatus.TOO_MANY_REQUESTS);
        blocked.setDetail("Too many sign-in attempts. Try again later.");
        blocked.getHeaders().set(HttpHeaders.RETRY_AFTER, String.valueOf(Duration.between(now, start.plus(WINDOW)).toSeconds() + 1));
        return blocked;
    }
}
