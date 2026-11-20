package com.bimap;

import module java.base;

import com.bimap.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AccountLifecycleTest extends ApiTest {

    @Autowired
    private JwtEncoder encoder;

    private String admin;

    @BeforeEach
    void signIn() throws Exception {
        admin = bearer(tokenFor(User.Role.ADMINISTRATOR));
    }

    @Test
    void lastActiveAdministratorCannotBeDeletedDisabledOrDemoted() throws Exception {
        var only = users.findByEmail("administrator@bimap.test").orElseThrow();
        createUser("disabled-admin@bimap.test", User.Role.ADMINISTRATOR, false);
        mvc.perform(delete("/users/" + only.getId()).header(HttpHeaders.AUTHORIZATION, admin)).andExpect(status().isConflict());
        update(only, "ADMINISTRATOR", false, null, 409);
        update(only, "USER", true, null, 409);
        login(only.getEmail(), PASSWORD);
        assertThat(only.isEnabled()).isTrue();
        assertThat(only.getRole()).isEqualTo(User.Role.ADMINISTRATOR);
    }

    @Test
    void administratorCanBeRemovedWhenAnotherActiveAdministratorRemains() throws Exception {
        var second = createUser("second-admin@bimap.test", User.Role.ADMINISTRATOR, true);
        mvc.perform(delete("/users/" + second.getId()).header(HttpHeaders.AUTHORIZATION, admin)).andExpect(status().isNoContent());
        assertThat(users.findById(second.getId())).isEmpty();
    }

    @Test
    void omittedRolePreservesExistingPermissions() throws Exception {
        var manager = createUser("keep-manager@bimap.test", User.Role.MANAGER, true);
        mvc.perform(json(put("/users/" + manager.getId()), """
                {"name":"Changed","surname":"User","email":"keep-manager@bimap.test"}""")
                .header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("MANAGER"));
    }

    @Test
    void passwordChangeRevokesOldTokensAndNewPasswordSignsIn() throws Exception {
        var user = createUser("reset@bimap.test", User.Role.USER, true);
        var oldToken = bearer(login(user.getEmail(), PASSWORD));
        update(user, "USER", true, "a-new-strong-password", 200);
        mvc.perform(get("/assets").header(HttpHeaders.AUTHORIZATION, oldToken)).andExpect(status().isUnauthorized());
        var newToken = bearer(login(user.getEmail(), "a-new-strong-password"));
        mvc.perform(get("/assets").header(HttpHeaders.AUTHORIZATION, newToken)).andExpect(status().isOk());
    }

    @Test
    void disablingAndReenablingDoesNotReviveTokens() throws Exception {
        var user = createUser("reactivate@bimap.test", User.Role.USER, true);
        var token = bearer(login(user.getEmail(), PASSWORD));
        update(user, "USER", false, null, 200);
        update(user, "USER", true, null, 200);
        mvc.perform(get("/assets").header(HttpHeaders.AUTHORIZATION, token)).andExpect(status().isUnauthorized());
        login(user.getEmail(), PASSWORD);
    }

    @Test
    void rejectsTokensWithMissingOrMalformedVersions() throws Exception {
        var subject = users.findByEmail("administrator@bimap.test").orElseThrow().getId().toString();
        for (var version : List.of("-1", "00", "garbage", 0, List.of("0"))) {
            var claims = JwtClaimsSet.builder().subject(subject).claim("ver", version).expiresAt(Instant.now().plusSeconds(600)).build();
            reject(claims);
        }
        reject(JwtClaimsSet.builder().subject(subject).expiresAt(Instant.now().plusSeconds(600)).build());
    }

    private void reject(JwtClaimsSet claims) throws Exception {
        var token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        mvc.perform(get("/users").header(HttpHeaders.AUTHORIZATION, bearer(token))).andExpect(status().isUnauthorized());
    }

    private void update(User user, String role, boolean enabled, String password, int expectedStatus) throws Exception {
        var body = """
                {"name":"Test","surname":"User","email":"%s","role":"%s","enabled":%s,"password":%s}"""
                .formatted(user.getEmail(), role, enabled, password == null ? "null" : "\"" + password + "\"");
        mvc.perform(json(put("/users/" + user.getId()), body).header(HttpHeaders.AUTHORIZATION, admin))
                .andExpect(status().is(expectedStatus));
    }
}
