package com.bimap;

import com.bimap.model.User;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class HtmlErrorPageTest extends ApiTest {

    @Test
    void unknownBrowserPageGetsGenericHtmlAndKeeps404() throws Exception {
        mvc.perform(get("/missing/deep/page").accept(MediaType.TEXT_HTML).header(HttpHeaders.AUTHORIZATION, bearer(tokenFor(User.Role.USER))))
                .andExpect(status().isNotFound()).andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(containsString("This page isn't available.")))
                .andExpect(content().string(not(containsString("missing/deep/page"))));
    }

    @Test
    void browserAuthenticationFailuresKeepTheStatusAndBearerChallenge() throws Exception {
        mvc.perform(get("/assets").accept(MediaType.TEXT_HTML))
                .andExpect(status().isUnauthorized()).andExpect(header().exists(HttpHeaders.WWW_AUTHENTICATE))
                .andExpect(content().string(containsString("This page isn't available.")));
    }

    @Test
    void browserAuthorizationFailuresUseTheSameGenericPage() throws Exception {
        mvc.perform(get("/users").accept(MediaType.TEXT_HTML).header(HttpHeaders.AUTHORIZATION, bearer(tokenFor(User.Role.USER))))
                .andExpect(status().isForbidden()).andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML));
    }

    @Test
    void errorAssetLinksWorkUnderAProxyPrefix() throws Exception {
        mvc.perform(get("/api/error.html").contextPath("/api").accept(MediaType.TEXT_HTML))
                .andExpect(status().isNotFound()).andExpect(content().string(containsString("<base href=\"/api/\">")));
    }

    @Test
    void containerErrorsDoNotExposeExceptionDetails() throws Exception {
        mvc.perform(get("/error").accept(MediaType.TEXT_HTML)
                        .requestAttr(RequestDispatcher.ERROR_STATUS_CODE, 500)
                        .requestAttr(RequestDispatcher.ERROR_EXCEPTION, new IllegalStateException("private-database-details")))
                .andExpect(status().isInternalServerError()).andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(content().string(not(containsString("private-database-details"))));
    }
}
