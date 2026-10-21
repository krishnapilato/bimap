package com.example.core;

import module java.base;
import com.example.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import static java.nio.charset.StandardCharsets.UTF_8;

@Configuration
public class SecurityConfig {

    private static final String[] PUBLIC = {"/auth/login", "/auth/signup", "/", "/error", "/favicon.svg", "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/actuator/health/**", "/actuator/info"};

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC).permitAll()
                        .requestMatchers("/users/**").hasAuthority("ADMINISTRATOR")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(server -> server.jwt(jwt -> jwt.jwtAuthenticationConverter(rolesFromToken())))
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.frontend-url:http://localhost:4200}") String frontendUrl) {
        var cors = new CorsConfiguration();
        cors.setAllowedOrigins(List.of(frontendUrl));
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        return source;
    }

    private static JwtAuthenticationConverter rolesFromToken() {
        var roles = new JwtGrantedAuthoritiesConverter();
        roles.setAuthoritiesClaimName("roles");
        roles.setAuthorityPrefix("");
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(roles);
        return converter;
    }

    @Bean
    SecretKeySpec jwtKey(@Value("${jwt.secret}") String secret) {
        return new SecretKeySpec(secret.getBytes(UTF_8), "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKeySpec jwtKey) {
        return NimbusJwtEncoder.withSecretKey(jwtKey).build();
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKeySpec jwtKey) {
        return NimbusJwtDecoder.withSecretKey(jwtKey).build();
    }

    @Bean
    UserDetailsService userDetailsService(UserRepository users) {
        return email -> users.findByEmail(email)
                .map(user -> User.withUsername(user.getEmail())
                        .password(user.getPassword())
                        .authorities(user.getRole().name())
                        .disabled(!user.isEnabled())
                        .accountLocked(user.isLocked())
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException(email));
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
        var provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }
}