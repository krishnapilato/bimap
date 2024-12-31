package com.research.culturalmap.cultural_map_explorer.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter for handling JWT authentication on every request.
 * Extends {@link OncePerRequestFilter} to ensure the filter is executed once per request.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	@Autowired
	private UserDetailsService userDetailsService;

	/**
	 * Filters incoming HTTP requests to authenticate users via JWT.
	 *
	 * @param request  the incoming HTTP request
	 * @param response the outgoing HTTP response
	 * @param filterChain the filter chain to continue processing the request
	 * @throws ServletException if an error occurs during the filtering process
	 * @throws IOException if an I/O error occurs
	 */
	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {

		// Skip JWT authentication for login and signup endpoints
		String requestURI = request.getRequestURI();
		if (requestURI.startsWith("/auth/login") || requestURI.startsWith("/auth/signup")) {
			filterChain.doFilter(request, response);
			return;
		}

		// Extract the Authorization header
		String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
		if (authHeader == null || !authHeader.startsWith("Bearer ")) {
			filterChain.doFilter(request, response);
			return;
		}

		// Extract the JWT token from the Authorization header
		String jwtToken = authHeader.substring(7);

		// Check if the user is already authenticated
		if (SecurityContextHolder.getContext().getAuthentication() != null) {
			filterChain.doFilter(request, response);
			return;
		}

		try {
			// Parse the JWT token directly to extract the username
			String userEmail = parseToken(jwtToken);

			// Load user details from the database
			UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);

			// Authenticate the user and set it in the SecurityContext
			UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
					userDetails, null, userDetails.getAuthorities());
			authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
			SecurityContextHolder.getContext().setAuthentication(authToken);
		} catch (Exception e) {
			// Handle token errors (e.g., expired or invalid token)
			SecurityContextHolder.clearContext();
			response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired token");
			return;
		}

		// Proceed with the filter chain if no issues occur
		filterChain.doFilter(request, response);
	}

	/**
	 * Parses a JWT token to extract the username.
	 *
	 * @param token The JWT token.
	 * @return The username contained in the token.
	 */
	private String parseToken(String token) {
		// Basic parsing logic for extracting the username.
		// Replace with a proper JWT library if needed.
		// Assuming the username is in the payload as `sub`.
		String[] chunks = token.split("\\.");
		if (chunks.length < 2) {
			throw new IllegalArgumentException("Invalid token");
		}
		String payload = new String(java.util.Base64.getUrlDecoder().decode(chunks[1]));
		return payload.replaceAll(".*\"sub\":\"([^\"]+)\".*", "$1");
	}
}