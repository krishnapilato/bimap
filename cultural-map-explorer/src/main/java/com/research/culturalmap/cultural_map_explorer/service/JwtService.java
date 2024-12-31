package com.research.culturalmap.cultural_map_explorer.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Simplified service for managing JSON Web Tokens (JWT).
 * Includes functionality for generating, validating, and extracting data from tokens.
 */
@Service
public class JwtService {

	private static final Logger logger = LoggerFactory.getLogger(JwtService.class);

	@Value("${jwt.secret:secret}")
	private String secretKey; // Secret key for signing JWTs

	@Value("${jwt.token.expiration:7200000}")
	private long tokenExpiration; // Token expiration in milliseconds

	/**
	 * Extracts the username (subject) from a JWT token.
	 *
	 * @param token The JWT token
	 * @return The username contained in the token
	 */
	public String extractUsername(String token) {
		return extractClaim(token, Claims::getSubject);
	}

	/**
	 * Extracts a specific claim from a JWT token.
	 *
	 * @param token          The JWT token
	 * @param claimsResolver Function to resolve the desired claim
	 * @param <T>            Type of the claim
	 * @return The extracted claim
	 */
	public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
		final Claims claims = extractAllClaims(token);
		return claimsResolver.apply(claims);
	}

	/**
	 * Validates a JWT token for a given user's details.
	 *
	 * @param token       The JWT token
	 * @param userDetails The user's details
	 * @return True if the token is valid, false otherwise
	 */
	public boolean isTokenValid(String token, UserDetails userDetails) {
		if (token == null || token.isBlank()) {
			return false;
		}

		try {
			final String username = extractUsername(token);
			return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
		} catch (ExpiredJwtException e) {
			logger.warn("JWT Token expired: {}", e.getMessage());
			return false;
		} catch (JwtException e) {
			logger.error("Invalid JWT token: {}", e.getMessage());
			return false;
		}
	}

	/**
	 * Generates a JWT token for a user.
	 *
	 * @param userDetails The user's details
	 * @return The generated JWT token
	 */
	public String generateToken(UserDetails userDetails) {
		Map<String, Object> claims = new HashMap<>();
		claims.put("roles", userDetails.getAuthorities().stream()
				.map(GrantedAuthority::getAuthority)
				.collect(Collectors.toList()));
		return generateToken(claims, userDetails);
	}

	/**
	 * Generates a JWT token with extra claims.
	 *
	 * @param extraClaims Additional claims to include in the token
	 * @param userDetails The user's details
	 * @return The generated JWT token
	 */
	public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
		Instant now = Instant.now();
		return Jwts.builder()
				.setClaims(extraClaims)
				.setSubject(userDetails.getUsername())
				.setIssuer("Cultural Map Explorer")
				.setIssuedAt(Date.from(now))
				.setExpiration(Date.from(now.plusMillis(tokenExpiration)))
				.signWith(getSignInKey(), SignatureAlgorithm.HS512)
				.compact();
	}

	/**
	 * Retrieves the expiration date from a JWT token.
	 *
	 * @param token The JWT token
	 * @return The expiration date
	 */
	public Date extractExpiration(String token) {
		return extractAllClaims(token).getExpiration();
	}

	/**
	 * Parses and extracts all claims from a JWT token.
	 *
	 * @param token The JWT token
	 * @return The extracted claims
	 */
	private Claims extractAllClaims(String token) {
		return Jwts.parserBuilder()
				.setSigningKey(getSignInKey())
				.build()
				.parseClaimsJws(token)
				.getBody();
	}

	/**
	 * Checks if a JWT token is expired.
	 *
	 * @param token The JWT token
	 * @return True if the token is expired, false otherwise
	 */
	private boolean isTokenExpired(String token) {
		try {
			return extractExpiration(token).before(new Date());
		} catch (ExpiredJwtException e) {
			logger.warn("JWT Token expired: {}", e.getMessage());
			return true;
		}
	}

	/**
	 * Retrieves the signing key for JWT token generation and validation.
	 *
	 * @return The signing key
	 */
	private SecretKey getSignInKey() {
		return Keys.hmacShaKeyFor(Base64.getDecoder().decode(secretKey));
	}
}