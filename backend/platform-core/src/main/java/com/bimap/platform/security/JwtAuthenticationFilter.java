package com.bimap.platform.security;

import com.bimap.platform.context.AuthenticatedUser;
import com.bimap.platform.context.CurrentRequest;
import com.bimap.platform.context.RequestContext;
import com.bimap.platform.error.ErrorCode;
import com.bimap.platform.web.CorrelationIdFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/// Turns a bearer token into an authenticated principal, and opens the request context.
/// @author Khova Krishna Pilato
@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /// Set when a token was well formed but past expiry, so the entry point can say so precisely.
    public static final String EXPIRED_ATTRIBUTE = JwtAuthenticationFilter.class.getName() + ".expired";
    public static final String ERROR_CODE_ATTRIBUTE = JwtAuthenticationFilter.class.getName() + ".errorCode";

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String MDC_USER = "user";

    private final JwtService jwtService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {

        var context = authenticate(request);

        if (context.isAuthenticated()) {
            MDC.put(MDC_USER, context.user().email());
        }
        try {
            CurrentRequest.bind(context, () -> {
                chain.doFilter(request, response);
                return null;
            });
        } catch (IOException | ServletException | RuntimeException rethrown) {
            throw rethrown;
        } catch (Exception unexpected) {
            throw new ServletException(unexpected);
        } finally {
            MDC.remove(MDC_USER);
        }
    }

    private RequestContext authenticate(HttpServletRequest request) {
        var correlationId = request.getAttribute(CorrelationIdFilter.ATTRIBUTE) instanceof String id
                ? id
                : UUID.randomUUID().toString();
        var anonymous = new RequestContext(correlationId, Instant.now(), null);

        var header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            return anonymous;
        }

        return switch (jwtService.verify(header.substring(BEARER_PREFIX.length()).strip(), TokenType.ACCESS)) {
            case TokenVerification.Valid(AuthenticatedUser user, String tokenId, TokenType type, Instant expiresAt) -> {
                var authentication = new UsernamePasswordAuthenticationToken(user, null, authoritiesOf(user));
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.trace("Authenticated {} via {} token {} valid until {}", user.email(), type, tokenId, expiresAt);
                yield anonymous.withUser(user);
            }
            case TokenVerification.Expired(Instant expiredAt) -> {
                log.debug("Access token expired at {}", expiredAt);
                request.setAttribute(EXPIRED_ATTRIBUTE, expiredAt);
                request.setAttribute(ERROR_CODE_ATTRIBUTE, ErrorCode.TOKEN_EXPIRED);
                yield anonymous;
            }
            case TokenVerification.Invalid(String reason) -> {
                log.debug("Access token rejected: {}", reason);
                request.setAttribute(ERROR_CODE_ATTRIBUTE, ErrorCode.TOKEN_INVALID);
                yield anonymous;
            }
        };
    }

    /// Grants `ROLE_X` for the coarse role plus every fine-grained authority carried in the token.
    private static List<SimpleGrantedAuthority> authoritiesOf(AuthenticatedUser user) {
        var granted = new ArrayList<SimpleGrantedAuthority>(user.authorities().size() + 1);
        if (user.role() != null && !user.role().isBlank()) {
            granted.add(new SimpleGrantedAuthority("ROLE_" + user.role()));
        }
        user.authorities().stream().map(SimpleGrantedAuthority::new).forEach(granted::add);
        return granted;
    }
}
