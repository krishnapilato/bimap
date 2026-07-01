package com.example.core.security;

import com.example.beans.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtils {

    private static final long JWT_TOKEN_VALIDITY_MS = 10 * 60 * 60 * 1000L;

    private final SecretKey signingKey;

    public JwtUtils(@Value("${jwt.secret}") String secret) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public <T> T getClaimFromToken(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = getAllClaimsFromToken(token);
        return claimsResolver.apply(claims);
    }

    public String getUsernameFromToken(String token) {
        return getClaimFromToken(token, Claims::getSubject);
    }

    public Date getExpirationDateFromToken(String token) {
        return getClaimFromToken(token, Claims::getExpiration);
    }

    public String generateToken(UserDetails userDetails) {
        return doGenerateToken(Map.of("roles", userDetails.getAuthorities()), userDetails.getUsername());
    }

    public String generateToken(User user) {
        return doGenerateToken(Map.of("roles", user.getApplicationRole()), user.getEmail());
    }

    public boolean validateToken(String token, UserDetails userDetails) {
        final String username = getUsernameFromToken(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private Claims getAllClaimsFromToken(String token) {
        return Jwts.parser().verifyWith(this.signingKey).build().parseSignedClaims(token).getPayload();
    }

    private boolean isTokenExpired(String token) {
        final Date expiration = getExpirationDateFromToken(token);
        return expiration.before(new Date());
    }

    private String doGenerateToken(Map<String, Object> claims, String subject) {
        long nowMillis = System.currentTimeMillis();

        return Jwts.builder().claims(claims).subject(subject).issuedAt(new Date(nowMillis)).expiration(new Date(nowMillis + JWT_TOKEN_VALIDITY_MS)).signWith(this.signingKey).compact();
    }
}