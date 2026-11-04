package com.bimap;

import module java.base;

import com.bimap.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ConcurrentAccountTest extends ApiTest {

    @Test
    void simultaneousSignupsForOneEmailReturnCreatedAndConflict() throws Exception {
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            Callable<Integer> signup = () -> {
                start.await();
                return mvc.perform(json(post("/auth/signup"), """
                        {"name":"Concurrent","surname":"User","email":"concurrent-signup@bimap.test","password":"%s"}""".formatted(PASSWORD)))
                        .andReturn().getResponse().getStatus();
            };
            var first = pool.submit(signup);
            var second = pool.submit(signup);
            start.countDown();
            assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS))).containsExactlyInAnyOrder(201, 409);
        } finally {
            users.findByEmail("concurrent-signup@bimap.test").ifPresent(users::delete);
        }
    }

    @Test
    void simultaneousAdministratorDeletionsLeaveOneActiveAdministrator() throws Exception {
        var first = createUser("concurrent-admin-1@bimap.test", User.Role.ADMINISTRATOR, true);
        var second = createUser("concurrent-admin-2@bimap.test", User.Role.ADMINISTRATOR, true);
        var firstToken = bearer(login(first.getEmail(), PASSWORD));
        var secondToken = bearer(login(second.getEmail(), PASSWORD));
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var a = pool.submit(() -> {
                start.await();
                return mvc.perform(delete("/users/" + first.getId()).header(HttpHeaders.AUTHORIZATION, firstToken)).andReturn().getResponse().getStatus();
            });
            var b = pool.submit(() -> {
                start.await();
                return mvc.perform(delete("/users/" + second.getId()).header(HttpHeaders.AUTHORIZATION, secondToken)).andReturn().getResponse().getStatus();
            });
            start.countDown();
            assertThat(List.of(a.get(15, TimeUnit.SECONDS), b.get(15, TimeUnit.SECONDS))).containsExactlyInAnyOrder(204, 409);
            assertThat(users.countByRoleAndEnabledTrueAndLockedFalse(User.Role.ADMINISTRATOR)).isEqualTo(1);
        } finally {
            users.findById(first.getId()).ifPresent(users::delete);
            users.findById(second.getId()).ifPresent(users::delete);
        }
    }
}
