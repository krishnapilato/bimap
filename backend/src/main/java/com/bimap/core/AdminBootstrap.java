package com.bimap.core;

import com.bimap.service.UserService;
import com.bimap.validation.BcryptSize;
import com.bimap.validation.EmailAddress;
import jakarta.validation.Validator;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("bootstrap-admin")
public class AdminBootstrap implements ApplicationRunner {

    private final UserService users;
    private final Validator validator;
    private final Credentials credentials;

    public AdminBootstrap(UserService users, Validator validator, @Value("${BOOTSTRAP_ADMIN_EMAIL:}") String email, @Value("${BOOTSTRAP_ADMIN_PASSWORD:}") String password) {
        this.users = users;
        this.validator = validator;
        this.credentials = new Credentials(email, password);
    }

    private record Credentials(@NotBlank @EmailAddress String email, @NotBlank @Size(min = 8, max = 72) @BcryptSize String password) { }

    @Override
    public void run(@NonNull ApplicationArguments args) {
        if (!validator.validate(credentials).isEmpty()) {
            throw new IllegalStateException("Set a valid BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD before enabling bootstrap-admin.");
        }
        users.bootstrapAdministrator(credentials.email(), credentials.password());
    }
}
