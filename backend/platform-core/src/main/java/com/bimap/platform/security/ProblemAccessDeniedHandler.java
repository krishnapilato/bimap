package com.bimap.platform.security;

import com.bimap.platform.context.CurrentRequest;
import com.bimap.platform.error.ErrorCode;
import com.bimap.platform.error.ProblemDetailFactory;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.io.IOException;

/// Answers authenticated-but-not-permitted requests as RFC 7807, and logs who was turned away.
/// @author Khova Krishna Pilato
@Slf4j
@RequiredArgsConstructor
public class ProblemAccessDeniedHandler implements AccessDeniedHandler {

    private final ProblemDetailFactory problems;
    private final ProblemResponseWriter writer;

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException, ServletException {

        log.warn("Access denied: {} attempted {} {}",
                CurrentRequest.userEmail().orElse("anonymous"), request.getMethod(), request.getRequestURI());

        writer.write(request, response, problems.create(ErrorCode.ACCESS_DENIED,
                "Your role does not allow this operation.", request.getRequestURI()));
    }
}
