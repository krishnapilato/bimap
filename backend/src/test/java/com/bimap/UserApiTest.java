package com.bimap;

import com.bimap.model.User;
import com.jayway.jsonpath.JsonPath;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpHeaders;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserApiTest extends ApiTest {

    @MockitoBean
    private JavaMailSender mailSender;

    private String admin;

    @BeforeEach
    void signInAsAdministrator() throws Exception {
        admin = bearer(tokenFor(User.Role.ADMINISTRATOR));
    }

    @Test
    void listsUsersWithoutPasswords() throws Exception {
        createUser("listed@bimap.test", User.Role.USER, false);

        as(get("/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[*].email", hasItem("listed@bimap.test")))
            .andExpect(jsonPath("$[0].password").doesNotExist())
            .andExpect(jsonPath("$[?(@.email == 'listed@bimap.test')].enabled").value(false));
    }

    @Test
    void checksWhetherAnEmailExists() throws Exception {
        createUser("exists@bimap.test", User.Role.USER, true);

        as(get("/users/exists").param("email", "exists@bimap.test")).andExpect(status().isOk()).andExpect(content().string("true"));
        as(get("/users/exists").param("email", "missing@bimap.test")).andExpect(status().isOk()).andExpect(content().string("false"));
        as(get("/users/exists").param("email", "not-an-email")).andExpect(status().isBadRequest());
    }

    @Test
    void createsUpdatesAndDeletesAUser() throws Exception {
        var created = as(json(post("/users"), """
            {"name": "Sara", "surname": "Neri", "email": "sara@bimap.test", "password": "%s", "role": "MANAGER", "enabled": true}""".formatted(PASSWORD)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.role").value("MANAGER"))
            .andExpect(jsonPath("$.enabled").value(true))
            .andExpect(jsonPath("$.password").doesNotExist())
            .andReturn().getResponse().getContentAsString();
        var id = JsonPath.<Integer>read(created, "$.id");

        login("sara@bimap.test", PASSWORD);

        as(json(put("/users/" + id), """
            {"name": "Sara", "surname": "Neri", "email": "sara.neri@bimap.test", "role": "USER", "enabled": false}"""))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("sara.neri@bimap.test"))
            .andExpect(jsonPath("$.role").value("USER"))
            .andExpect(jsonPath("$.enabled").value(false));
        assertThat(users.findByEmail("sara.neri@bimap.test")).get().satisfies(user -> assertThat(user.getPassword()).startsWith("$2"));

        as(delete("/users/" + id)).andExpect(status().isNoContent());
        as(delete("/users/" + id)).andExpect(status().isNotFound());
        assertThat(users.existsByEmail("sara.neri@bimap.test")).isFalse();
    }

    @Test
    void updateKeepsPasswordAndEnabledWhenNotSent() throws Exception {
        var user = createUser("keep@bimap.test", User.Role.USER, false);

        as(json(put("/users/" + user.getId()), """
            {"name": "New", "surname": "Name", "email": "keep@bimap.test", "role": "USER"}"""))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.enabled").value(false));
        assertThat(users.findById(user.getId())).get().satisfies(saved -> assertThat(saved.getName()).isEqualTo("New"));

        as(json(put("/users/" + user.getId()), """
            {"name": "New", "surname": "Name", "email": "keep@bimap.test", "role": "USER", "enabled": true}"""))
            .andExpect(status().isOk());
        login("keep@bimap.test", PASSWORD);
    }

    @Test
    void rejectsInvalidUsers() throws Exception {
        createUser("dup@bimap.test", User.Role.USER, true);

        as(json(post("/users"), """
            {"name": "A", "surname": "B", "email": "nopass@bimap.test", "role": "USER"}""")).andExpect(status().isBadRequest());
        as(json(post("/users"), """
            {"name": "A", "surname": "B", "email": "DUP@bimap.test", "password": "%s", "role": "USER"}""".formatted(PASSWORD))).andExpect(status().isConflict());
        as(json(post("/users"), """
            {"name": "A", "surname": "B", "email": "role@bimap.test", "password": "%s", "role": "ROOT"}""".formatted(PASSWORD))).andExpect(status().isBadRequest());
        as(json(post("/users"), """
            {"name": " ", "surname": "B", "email": "bad", "password": "short", "role": "USER"}"""))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors.name").exists())
            .andExpect(jsonPath("$.errors.email").exists())
            .andExpect(jsonPath("$.errors.password").exists());
        as(json(put("/users/999999"), """
            {"name": "A", "surname": "B", "email": "ghost@bimap.test", "role": "USER"}""")).andExpect(status().isNotFound());
        as(get("/users/abc")).andExpect(status().isMethodNotAllowed());
        as(delete("/users/abc")).andExpect(status().isBadRequest());
        as(delete("/users/0")).andExpect(status().isBadRequest());
        as(post("/users/-1/welcome-email")).andExpect(status().isBadRequest());
    }

    @Test
    void updateRejectsAnEmailOwnedByAnotherUser() throws Exception {
        createUser("first@bimap.test", User.Role.USER, true);
        var second = createUser("second@bimap.test", User.Role.USER, true);

        as(json(put("/users/" + second.getId()), """
            {"name": "A", "surname": "B", "email": "First@bimap.test", "role": "USER"}""")).andExpect(status().isConflict());
    }

    @Test
    void sendsAnEscapedWelcomeEmail() throws Exception {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
        var user = createUser("welcome@bimap.test", User.Role.USER, true);
        user.setName("<script>alert(1)</script>");
        users.save(user);

        as(post("/users/" + user.getId() + "/welcome-email")).andExpect(status().isNoContent());

        var sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(sent.capture());
        assertThat(sent.getValue().getAllRecipients()[0]).hasToString("welcome@bimap.test");
        assertThat((String) sent.getValue().getContent()).contains("&lt;script&gt;").doesNotContain("<script>");
    }

    @Test
    void reportsMailServerFailuresWithoutDetails() throws Exception {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
        doThrow(new MailSendException("smtp.internal.example refused")).when(mailSender).send(any(MimeMessage.class));
        var user = createUser("unlucky@bimap.test", User.Role.USER, true);

        as(post("/users/" + user.getId() + "/welcome-email"))
            .andExpect(status().isServiceUnavailable())
            .andExpect(content().string(not(containsString("smtp.internal"))));
    }

    @Test
    void validatesPasswordBytesOnCreateAndUpdate() throws Exception {
        var user = createUser("unicode-admin@bimap.test", User.Role.USER, true);
        var invalid = """
                {"name":"A","surname":"B","email":"unicode-admin@bimap.test","password":"%s"}""".formatted("é".repeat(37));
        as(json(post("/users"), invalid)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.password").exists());
        as(json(put("/users/" + user.getId()), invalid)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.password").exists());
        login(user.getEmail(), PASSWORD);
        var valid = invalid.replace("é".repeat(37), "é".repeat(36));
        as(json(put("/users/" + user.getId()), valid)).andExpect(status().isOk());
        login(user.getEmail(), "é".repeat(36));
        as(json(post("/users"), valid.replace("unicode-admin@bimap.test", "unicode-created@bimap.test"))).andExpect(status().isCreated());
        login("unicode-created@bimap.test", "é".repeat(36));
    }

    private ResultActions as(MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.header(HttpHeaders.AUTHORIZATION, admin));
    }
}
