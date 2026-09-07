package com.bimap.platform.security;

import com.bimap.platform.error.ErrorCode;
import com.bimap.platform.error.ProblemDetailFactory;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;

import java.io.IOException;
import java.time.Instant;

/// Answers unauthenticated requests with the same RFC 7807 shape as every other error.
/// @author Khova Krishna Pilato
@RequiredArgsConstructor
public class ProblemAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ProblemDetailFactory problems;
    private final ProblemResponseWriter writer;

    @Override
    public void commence(HttpServletRequest request,
                         HttpServletResponse response,
                         AuthenticationException authenticationException) throws IOException, ServletException {

        var code = request.getAttribute(JwtAuthenticationFilter.ERROR_CODE_ATTRIBUTE) instanceof ErrorCode attributed
                ? attributed
                : ErrorCode.AUTHENTICATION_REQUIRED;

        var detail = switch (code) {
            case TOKEN_EXPIRED -> {
                var expiredAt = request.getAttribute(JwtAuthenticationFilter.EXPIRED_ATTRIBUTE);
                yield expiredAt instanceof Instant instant
                        ? "The access token expired at %s. Use the refresh token to obtain a new one.".formatted(instant)
                        : "The access token has expired. Use the refresh token to obtain a new one.";
            }
            case TOKEN_INVALID -> "The access token could not be verified. Sign in again.";
            default -> "This endpoint requires a valid bearer token.";
        };

        writer.write(request, response, problems.create(code, detail, request.getRequestURI()));
    }
}
