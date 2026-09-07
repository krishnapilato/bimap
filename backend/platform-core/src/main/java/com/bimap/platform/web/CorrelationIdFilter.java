package com.bimap.platform.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.jspecify.annotations.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/// Gives every request an id that follows it through the logs of both services.
/// @author Khova Krishna Pilato
public class CorrelationIdFilter extends OncePerRequestFilter implements Ordered {

    public static final String HEADER = "X-Correlation-Id";
    public static final String ATTRIBUTE = CorrelationIdFilter.class.getName() + ".id";

    private static final String MDC_CORRELATION_ID = "correlationId";
    private static final String MDC_METHOD = "httpMethod";
    private static final String MDC_PATH = "httpPath";

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        var correlationId = resolve(request);

        request.setAttribute(ATTRIBUTE, correlationId);
        response.setHeader(HEADER, correlationId);

        MDC.put(MDC_CORRELATION_ID, correlationId);
        MDC.put(MDC_METHOD, request.getMethod());
        MDC.put(MDC_PATH, request.getRequestURI());
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_CORRELATION_ID);
            MDC.remove(MDC_METHOD);
            MDC.remove(MDC_PATH);
        }
    }

    private static String resolve(HttpServletRequest request) {
        var inbound = request.getHeader(HEADER);
        return inbound == null || inbound.isBlank() || inbound.length() > 64
                ? UUID.randomUUID().toString()
                : inbound.strip();
    }

    /// Runs before Spring Security so that even a rejected request is traceable.
    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
