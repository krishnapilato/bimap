package com.bimap;

import com.bimap.model.User;
import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthApiTest extends ApiTest {

    @Test
    void loginReturnsTokenAndUserWithoutPassword() throws Exception {
        createUser("anna@bimap.test", User.Role.MANAGER, true);

        mvc.perform(json(post("/auth/login"), """
                {"email": "anna@bimap.test", "password": "%s"}""".formatted(PASSWORD)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token", not(blankOrNullString())))
            .andExpect(jsonPath("$.user.id").isNumber())
            .andExpect(jsonPath("$.user.name").value("Test"))
            .andExpect(jsonPath("$.user.surname").value("User"))
            .andExpect(jsonPath("$.user.email").value("anna@bimap.test"))
            .andExpect(jsonPath("$.user.role").value("MANAGER"))
            .andExpect(jsonPath("$.user.password").doesNotExist());
    }

    @Test
    void loginIgnoresEmailCase() throws Exception {
        createUser("case@bimap.test", User.Role.USER, true);

        mvc.perform(json(post("/auth/login"), """
                {"email": "Case@BiMap.test", "password": "%s"}""".formatted(PASSWORD)))
            .andExpect(status().isOk());
    }

    @Test
    void loginRejectsWrongPasswordUnknownEmailAndDisabledAccountAlike() throws Exception {
        createUser("known@bimap.test", User.Role.USER, true);
        createUser("disabled@bimap.test", User.Role.USER, false);

        for (var credentials : new String[][]{{"known@bimap.test", "wrong-password"}, {"nobody@bimap.test", PASSWORD}, {"disabled@bimap.test", PASSWORD}}) {
            mvc.perform(json(post("/auth/login"), """
                    {"email": "%s", "password": "%s"}""".formatted(credentials[0], credentials[1])))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.token").doesNotExist());
        }
    }

    @Test
    void loginValidatesInput() throws Exception {
        mvc.perform(json(post("/auth/login"), """
                {"email": "not-an-email", "password": ""}"""))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.email").exists())
            .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void malformedJsonIsBadRequestWithoutInternals() throws Exception {
        mvc.perform(json(post("/auth/login"), "{\"email\": "))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.trace").doesNotExist())
            .andExpect(jsonPath("$.exception").doesNotExist());
    }

    @Test
    void signupCreatesUserRoleAccountAndSignsIn() throws Exception {
        mvc.perform(json(post("/auth/signup"), """
                {"name": "Luca", "surname": "Verdi", "email": "luca@bimap.test", "password": "%s"}""".formatted(PASSWORD)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token", not(blankOrNullString())))
            .andExpect(jsonPath("$.user.email").value("luca@bimap.test"))
            .andExpect(jsonPath("$.user.role").value("USER"))
            .andExpect(jsonPath("$.user.password").doesNotExist());
    }

    @Test
    void signupIgnoresRoleSentByClient() throws Exception {
        mvc.perform(json(post("/auth/signup"), """
                {"name": "Eve", "surname": "X", "email": "eve@bimap.test", "password": "%s", "role": "ADMINISTRATOR"}""".formatted(PASSWORD)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.user.role").value("USER"));
    }

    @Test
    void signupRejectsExistingEmailInAnyCase() throws Exception {
        createUser("taken@bimap.test", User.Role.USER, true);

        mvc.perform(json(post("/auth/signup"), """
                {"name": "A", "surname": "B", "email": "TAKEN@bimap.test", "password": "%s"}""".formatted(PASSWORD)))
            .andExpect(status().isConflict());
    }

    @Test
    void signupValidatesInput() throws Exception {
        mvc.perform(json(post("/auth/signup"), """
                {"name": "", "surname": "%s", "email": "x", "password": "short"}""".formatted("s".repeat(101))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.name").exists())
            .andExpect(jsonPath("$.errors.surname").exists())
            .andExpect(jsonPath("$.errors.email").exists())
            .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void signupRejectsPasswordsBcryptWouldTruncate() throws Exception {
        mvc.perform(json(post("/auth/signup"), """
                {"name": "A", "surname": "B", "email": "long@bimap.test", "password": "%s"}""".formatted("p".repeat(73))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.password", not(nullValue())));
    }
}
