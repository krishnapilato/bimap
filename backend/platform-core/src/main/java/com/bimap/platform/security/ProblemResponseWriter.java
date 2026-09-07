package com.bimap.platform.security;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

/// Renders a security failure in whichever form the caller can actually use.
///
/// These failures are raised by the filter chain, before any controller runs, so the usual
/// content negotiation never gets a chance. Without this a browser typing a wrong URL is handed
/// a wall of raw JSON. An API client gets the RFC 7807 document; a browser is forwarded to the
/// error view, which renders the same facts as a page.
///
/// @author Khova Krishna Pilato
@RequiredArgsConstructor
public class ProblemResponseWriter {

    private final ObjectMapper objectMapper;

    public void write(HttpServletRequest request, HttpServletResponse response, ProblemDetail problem)
            throws IOException, ServletException {

        if (response.isCommitted()) {
            return;
        }
        response.setStatus(problem.getStatus());

        if (prefersHtml(request)) {
            forwardToErrorView(request, response, problem);
            return;
        }

        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getOutputStream(), problem);
    }

    /// Hands the failure to the container error pipeline so `error.html` renders it.
    private static void forwardToErrorView(HttpServletRequest request, HttpServletResponse response,
                                           ProblemDetail problem) throws ServletException, IOException {

        request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, problem.getStatus());
        request.setAttribute(RequestDispatcher.ERROR_MESSAGE, problem.getDetail());
        request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, request.getRequestURI());

        request.getRequestDispatcher("/error").forward(request, response);
    }

    /// True for a browser navigation: `text/html` asked for, and asked for ahead of JSON.
    private static boolean prefersHtml(HttpServletRequest request) {
        var accept = request.getHeader("Accept");
        if (accept == null || accept.isBlank()) {
            return false;
        }
        var html = accept.indexOf(MediaType.TEXT_HTML_VALUE);
        if (html < 0) {
            return false;
        }
        var json = accept.indexOf("application/json");
        return json < 0 || html < json;
    }
}
