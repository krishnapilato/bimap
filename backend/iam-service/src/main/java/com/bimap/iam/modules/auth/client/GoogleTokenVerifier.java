package com.bimap.iam.modules.auth.client;

import com.bimap.iam.config.AuthProperties;
import com.bimap.platform.error.AuthenticationFailedException;
import com.bimap.platform.error.BusinessRuleException;
import com.bimap.platform.error.ErrorCode;
import com.bimap.platform.error.UpstreamServiceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;

/// Checks a Google ID token against Google, then against our own expectations.
/// @author Khova Krishna Pilato
@Slf4j
@Component
public class GoogleTokenVerifier {

    private static final String UPSTREAM = "google-tokeninfo";

    private final RestClient client;
    private final AuthProperties authProperties;

    public GoogleTokenVerifier(RestClient.Builder builder, AuthProperties authProperties) {
        this.client = builder.baseUrl("https://oauth2.googleapis.com").build();
        this.authProperties = authProperties;
    }

    public GoogleTokenInfo verify(String idToken) {
        if (!authProperties.googleSignInConfigured()) {
            throw new BusinessRuleException("Google sign-in is not configured on this server.");
        }

        var info = fetch(idToken);
        var now = Instant.now();

        if (!info.issuedByGoogle()) {
            throw reject("the token was not issued by Google");
        }
        if (!info.addressedTo(authProperties.googleClientId())) {
            throw reject("the token was issued for a different application");
        }
        if (info.expired(now)) {
            throw new AuthenticationFailedException(ErrorCode.TOKEN_EXPIRED,
                    "The Google sign-in has expired. Try again.");
        }
        if (!info.emailIsVerified()) {
            throw reject("the Google account has no verified email address");
        }
        return info;
    }

    private GoogleTokenInfo fetch(String idToken) {
        try {
            return client.get()
                    .uri(uri -> uri.path("/tokeninfo").queryParam("id_token", idToken).build())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                        throw reject("Google rejected the token");
                    })
                    .body(GoogleTokenInfo.class);
        } catch (AuthenticationFailedException rethrown) {
            throw rethrown;
        } catch (RuntimeException failure) {
            throw new UpstreamServiceException(UPSTREAM, "could not verify the Google token", failure);
        }
    }

    private static AuthenticationFailedException reject(String reason) {
        log.warn("Google sign-in rejected: {}", reason);
        return new AuthenticationFailedException(ErrorCode.TOKEN_INVALID,
                "Google sign-in could not be verified.");
    }
}
