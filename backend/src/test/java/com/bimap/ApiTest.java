package com.bimap;

import module java.base;

import com.bimap.model.User;
import com.bimap.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public abstract class ApiTest {

    protected static final String PASSWORD = "correct-horse-battery";

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected UserRepository users;

    @Autowired
    private PasswordEncoder passwordEncoder;

    protected User createUser(String email, User.Role role, boolean enabled) {
        var user = new User("Test", "User", email, passwordEncoder.encode(PASSWORD), role);
        user.setEnabled(enabled);
        return users.save(user);
    }

    protected String tokenFor(User.Role role) throws Exception {
        var email = role.name().toLowerCase(Locale.ROOT) + "@bimap.test";
        if (!users.existsByEmail(email)) createUser(email, role, true);
        return login(email, PASSWORD);
    }

    protected String login(String email, String password) throws Exception {
        var body = mvc.perform(json(post("/auth/login"), """
                        {"email": "%s", "password": "%s"}""".formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    protected static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
        return request.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }
}
