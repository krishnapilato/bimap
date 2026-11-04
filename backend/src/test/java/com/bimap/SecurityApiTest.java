package com.bimap;

import module java.base;

import com.bimap.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityApiTest extends ApiTest {

    @Autowired
    private JwtEncoder jwtEncoder;

    @Test
    void protectedEndpointsNeedAToken() throws Exception {
        for (var request : List.of(get("/assets"), get("/forms/export.csv"), post("/forms"), get("/places/regions?q=a"),
                get("/users"), get("/users/exists?email=a@b.it"), post("/users"), put("/users/1"), delete("/users/1"), post("/users/1/welcome-email"))) {
            mvc.perform(request).andExpect(status().isUnauthorized());
        }
    }

    @Test
    void userManagementIsForAdministratorsOnly() throws Exception {
        for (var role : List.of(User.Role.USER, User.Role.MANAGER)) {
            var token = bearer(tokenFor(role));
            mvc.perform(get("/users").header(HttpHeaders.AUTHORIZATION, token)).andExpect(status().isForbidden());
            mvc.perform(delete("/users/1").header(HttpHeaders.AUTHORIZATION, token)).andExpect(status().isForbidden());
            mvc.perform(get("/assets").header(HttpHeaders.AUTHORIZATION, token)).andExpect(status().isOk());
        }
        mvc.perform(get("/users").header(HttpHeaders.AUTHORIZATION, bearer(tokenFor(User.Role.ADMINISTRATOR)))).andExpect(status().isOk());
    }

    @Test
    void rejectsMalformedForgedExpiredAndUnsignedTokens() throws Exception {
        createUser("admin@bimap.test", User.Role.ADMINISTRATOR, true);
        var now = Instant.now();
        var valid = claims("admin@bimap.test", now, now.plusSeconds(600));
        var forged = NimbusJwtEncoder.withSecretKey(new SecretKeySpec("another-secret-that-is-long-enough!!".getBytes(StandardCharsets.UTF_8), "HmacSHA256")).build();
        var payload = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"sub\":\"admin@bimap.test\",\"exp\":%d}".formatted(now.plusSeconds(600).getEpochSecond()).getBytes(StandardCharsets.UTF_8));
        var unsigned = Base64.getUrlEncoder().withoutPadding().encodeToString("{\"alg\":\"none\"}".getBytes(StandardCharsets.UTF_8)) + "." + payload + ".";

        for (var token : List.of("not-a-jwt", sign(jwtEncoder, claims("admin@bimap.test", now.minusSeconds(7200), now.minusSeconds(3600))),
                sign(forged, valid), unsigned, sign(jwtEncoder, JwtClaimsSet.builder().subject("admin@bimap.test").issuedAt(now).build()))) {
            mvc.perform(get("/users").header(HttpHeaders.AUTHORIZATION, bearer(token))).andExpect(status().isUnauthorized());
        }
        mvc.perform(get("/users").header(HttpHeaders.AUTHORIZATION, bearer(sign(jwtEncoder, valid)))).andExpect(status().isOk());
    }

    @Test
    void roleClaimInTokenCannotEscalatePrivileges() throws Exception {
        createUser("plain@bimap.test", User.Role.USER, true);
        var now = Instant.now();
        var token = sign(jwtEncoder, JwtClaimsSet.builder().subject("plain@bimap.test").issuedAt(now).expiresAt(now.plusSeconds(600)).claim("roles", "ADMINISTRATOR").build());

        mvc.perform(get("/users").header(HttpHeaders.AUTHORIZATION, bearer(token))).andExpect(status().isForbidden());
    }

    @Test
    void tokensStopWorkingWhenTheAccountIsDisabledDeletedOrDemoted() throws Exception {
        var disabled = createUser("soon-disabled@bimap.test", User.Role.ADMINISTRATOR, true);
        var deleted = createUser("soon-deleted@bimap.test", User.Role.ADMINISTRATOR, true);
        var demoted = createUser("soon-demoted@bimap.test", User.Role.ADMINISTRATOR, true);
        var disabledToken = bearer(login(disabled.getEmail(), PASSWORD));
        var deletedToken = bearer(login(deleted.getEmail(), PASSWORD));
        var demotedToken = bearer(login(demoted.getEmail(), PASSWORD));

        disabled.setEnabled(false);
        demoted.setRole(User.Role.USER);
        users.saveAll(List.of(disabled, demoted));
        users.delete(deleted);

        mvc.perform(get("/assets").header(HttpHeaders.AUTHORIZATION, disabledToken)).andExpect(status().isUnauthorized());
        mvc.perform(get("/assets").header(HttpHeaders.AUTHORIZATION, deletedToken)).andExpect(status().isUnauthorized());
        mvc.perform(get("/users").header(HttpHeaders.AUTHORIZATION, demotedToken)).andExpect(status().isForbidden());
    }

    @Test
    void publicEndpointsStayPublic() throws Exception {
        mvc.perform(get("/")).andExpect(status().isOk());
        mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
        mvc.perform(get("/actuator/info")).andExpect(status().isOk());
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
    }

    @Test
    void publicPagesHideRuntimeDetails() throws Exception {
        mvc.perform(get("/actuator/info"))
                .andExpect(jsonPath("$.java").doesNotExist())
                .andExpect(jsonPath("$.os").doesNotExist());
        mvc.perform(get("/"))
                .andExpect(content().string(not(containsString("Spring Boot"))))
                .andExpect(content().string(not(containsString("fonts.googleapis.com"))));
        mvc.perform(get("/actuator/health")).andExpect(jsonPath("$.components").doesNotExist());
        mvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/env").header(HttpHeaders.AUTHORIZATION, bearer(tokenFor(User.Role.ADMINISTRATOR)))).andExpect(status().isNotFound());
    }

    @Test
    void administratorsSeeHealthDetails() throws Exception {
        mvc.perform(get("/actuator/health").header(HttpHeaders.AUTHORIZATION, bearer(tokenFor(User.Role.ADMINISTRATOR))))
                .andExpect(jsonPath("$.components.db.status").value("UP"));
    }

    @Test
    void responsesCarrySecurityHeaders() throws Exception {
        for (var path : List.of("/", "/auth/login", "/swagger-ui/index.html")) {
            mvc.perform(get(path))
                    .andExpect(header().string("Content-Security-Policy", containsString("default-src 'self'")))
                    .andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors 'none'")))
                    .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                    .andExpect(header().string("X-Frame-Options", "DENY"))
                    .andExpect(header().string("Referrer-Policy", "no-referrer"));
        }
    }

    @Test
    void corsAllowsOnlyTheFrontendOrigin() throws Exception {
        mvc.perform(options("/auth/login").header(HttpHeaders.ORIGIN, "http://localhost:4200").header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:4200"));
        mvc.perform(options("/auth/login").header(HttpHeaders.ORIGIN, "https://evil.example").header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }

    @Test
    void signInAttemptsAreRateLimitedPerClient() throws Exception {
        var attempt = json(post("/auth/login"), """
                {"email": "nobody@bimap.test", "password": "wrong-password"}""");
        for (var i = 0; i < 10; i++) {
            mvc.perform(attempt.with(request -> { request.setRemoteAddr("203.0.113.7"); return request; })).andExpect(status().isUnauthorized());
        }
        mvc.perform(attempt.with(request -> { request.setRemoteAddr("203.0.113.7"); return request; }))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER));
        mvc.perform(attempt.with(request -> { request.setRemoteAddr("203.0.113.8"); return request; })).andExpect(status().isUnauthorized());
    }

    private static JwtClaimsSet claims(String subject, Instant issued, Instant expires) {
        return JwtClaimsSet.builder().subject(subject).issuedAt(issued).expiresAt(expires).build();
    }

    private static String sign(JwtEncoder encoder, JwtClaimsSet claims) {
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
