package com.bimap.core;

import com.bimap.ApiTest;
import com.bimap.model.User;
import com.bimap.service.UserService;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AdminBootstrapTest extends ApiTest {

    @Autowired
    private UserService service;

    @Autowired
    private Validator validator;

    @Test
    void createsFirstAdministratorAndDoesNotResetItOnRestart() throws Exception {
        var bootstrap = new AdminBootstrap(service, validator, "bootstrap@bimap.test", PASSWORD);
        bootstrap.run(new DefaultApplicationArguments());
        var admin = users.findByEmail("bootstrap@bimap.test").orElseThrow();
        assertThat(admin.getRole()).isEqualTo(User.Role.ADMINISTRATOR);
        assertThat(admin.canSignIn()).isTrue();
        new AdminBootstrap(service, validator, "other@bimap.test", "different-password").run(new DefaultApplicationArguments());
        assertThat(users.existsByEmail("other@bimap.test")).isFalse();
        login(admin.getEmail(), PASSWORD);
    }

    @Test
    void rejectsInvalidConfigurationWithoutDisclosingPassword() {
        var bootstrap = new AdminBootstrap(service, validator, "not-an-email", "é".repeat(37));
        assertThatThrownBy(() -> bootstrap.run(new DefaultApplicationArguments())).isInstanceOf(IllegalStateException.class).hasMessageNotContaining("é");
        assertThat(users.count()).isZero();
    }

    @Test
    void refusesToPromoteAnExistingPublicAccount() {
        var user = createUser("existing@bimap.test", User.Role.USER, true);
        var bootstrap = new AdminBootstrap(service, validator, user.getEmail(), PASSWORD);
        assertThatThrownBy(() -> bootstrap.run(new DefaultApplicationArguments())).isInstanceOf(ResponseStatusException.class);
        assertThat(user.getRole()).isEqualTo(User.Role.USER);
    }
}
