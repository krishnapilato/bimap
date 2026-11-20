package com.bimap.core;

import module java.base;

import org.junit.jupiter.api.Test;
import org.springframework.web.ErrorResponseException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LoginAttemptsTest {

    @Test
    void concurrentRequestsCannotExceedTheLimit() throws Exception {
        var limiter = new LoginAttempts();
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(24)) {
            var tasks = new ArrayList<Future<Boolean>>();
            for (var i = 0; i < 24; i++) {
                tasks.add(pool.submit(() -> {
                    start.await();
                    try {
                        limiter.reserve("same-client");
                        return true;
                    } catch (ErrorResponseException e) {
                        assertThat(e.getStatusCode().value()).isEqualTo(429);
                        return false;
                    }
                }));
            }
            start.countDown();
            var admitted = 0;
            for (var task : tasks) if (task.get(10, TimeUnit.SECONDS)) admitted++;
            assertThat(admitted).isEqualTo(10);
        }
    }

    @Test
    void successfulLoginsReleaseOnlyTheirOwnReservation() {
        var limiter = new LoginAttempts();
        for (var i = 0; i < 20; i++) limiter.reserve("client").succeeded();
        for (var i = 0; i < 9; i++) limiter.reserve("client");
        var attempt = limiter.reserve("client");
        assertThatThrownBy(() -> limiter.reserve("client")).isInstanceOf(ErrorResponseException.class);
        attempt.succeeded();
        attempt.succeeded();
        limiter.reserve("client");
        assertThatThrownBy(() -> limiter.reserve("client")).isInstanceOf(ErrorResponseException.class);
    }

    @Test
    void capacityIsBoundedWithoutEvictingExistingLimits() {
        var limiter = new LoginAttempts();
        for (var i = 0; i < 10; i++) limiter.reserve("blocked");
        for (var i = 1; i < 10_000; i++) limiter.reserve("client-" + i);
        assertThatThrownBy(() -> limiter.reserve("overflow")).isInstanceOf(ErrorResponseException.class);
        assertThatThrownBy(() -> limiter.reserve("blocked")).isInstanceOf(ErrorResponseException.class);
        limiter.reserve("client-1");
    }

    @Test
    void expiredWindowsFreeCapacityAndLateSuccessCannotResetANewWindow() {
        var clock = mock(Clock.class);
        var start = Instant.parse("2026-01-01T00:00:00Z");
        when(clock.instant()).thenReturn(start);
        var limiter = new LoginAttempts(clock);
        var old = limiter.reserve("client");
        for (var i = 1; i < 10_000; i++) limiter.reserve("client-" + i);
        when(clock.instant()).thenReturn(start.plusSeconds(900));
        for (var i = 0; i < 10; i++) limiter.reserve("client");
        old.succeeded();
        assertThatThrownBy(() -> limiter.reserve("client")).isInstanceOf(ErrorResponseException.class)
                .satisfies(exception -> assertThat(((ErrorResponseException) exception).getHeaders().getFirst("Retry-After")).isEqualTo("901"));
        limiter.reserve("new-client");
    }
}
