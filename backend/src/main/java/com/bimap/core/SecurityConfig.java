package com.bimap.core;

import module java.base;

import com.bimap.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    private static final int MIN_SECRET_BYTES = 32;
    private static final String[] PUBLIC = {"/auth/login", "/auth/signup", "/", "/index.html", "/landing.css", "/error", "/error.html", "/favicon.svg", "/images/**", "/fonts/**", "/landmarks/**",
            "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/actuator/health/**", "/actuator/info"};

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, UserRepository users, HtmlErrorPage errorPage,
                                            @Value("${app.security.content-security-policy}") String contentSecurityPolicy) {
        var bearerEntry = new BearerTokenAuthenticationEntryPoint();
        AuthenticationEntryPoint entry = (request, response, exception) -> {
            bearerEntry.commence(request, response, exception);
            if (errorPage.acceptsHtml(request)) errorPage.write(request, response, response.getStatus());
        };
        var bearerDenied = new BearerTokenAccessDeniedHandler();
        AccessDeniedHandler denied = (request, response, exception) -> {
            bearerDenied.handle(request, response, exception);
            if (errorPage.acceptsHtml(request)) errorPage.write(request, response, response.getStatus());
        };
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives(contentSecurityPolicy))
                        .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.NO_REFERRER)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(PUBLIC).permitAll()
                        .requestMatchers("/users/**").hasAuthority("ADMINISTRATOR")
                        .anyRequest().authenticated())
                .exceptionHandling(errors -> errors.authenticationEntryPoint(entry).accessDeniedHandler(denied))
                .oauth2ResourceServer(server -> server.authenticationEntryPoint(entry).accessDeniedHandler(denied)
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(currentAccount(users))))
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

    private static Converter<Jwt, AbstractAuthenticationToken> currentAccount(UserRepository users) {
        return jwt -> users.findById(Long.valueOf(Objects.requireNonNull(jwt.getSubject())))
                .filter(com.bimap.model.User::canSignIn)
                .filter(user -> Long.toString(user.getTokenVersion()).equals(jwt.getClaimAsString("ver")))
                .map(user -> new JwtAuthenticationToken(jwt, AuthorityUtils.createAuthorityList(user.getRole().name()), user.getEmail()))
                .orElseThrow(() -> new InvalidBearerTokenException("The account is no longer active."));
    }

    @Bean
    SecretKeySpec jwtKey(@Value("${jwt.secret}") String secret) {
        var bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secret.isBlank() || "at-least-32-random-characters-change-me".equals(secret)) {
            throw new IllegalStateException("jwt.secret must be a nonblank secret generated for this deployment.");
        }
        if (bytes.length < MIN_SECRET_BYTES) throw new IllegalStateException("jwt.secret must be at least %d bytes long.".formatted(MIN_SECRET_BYTES));
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKeySpec jwtKey) {
        return NimbusJwtEncoder.withSecretKey(jwtKey).build();
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKeySpec jwtKey) {
        var decoder = NimbusJwtDecoder.withSecretKey(jwtKey).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(),
                new JwtClaimValidator<Instant>(JwtClaimNames.EXP, _ -> true),
                new JwtClaimValidator<String>(JwtClaimNames.SUB, SecurityConfig::isUserId),
                new JwtClaimValidator<Object>("ver", value -> value instanceof String version && version.matches("0|[1-9][0-9]{0,18}"))));
        return decoder;
    }

    private static boolean isUserId(String subject) {
        try {
            return subject != null && Long.parseLong(subject) > 0;
        } catch (NumberFormatException _) {
            return false;
        }
    }

    @Bean
    UserDetailsService userDetailsService(UserRepository users) {
        return email -> users.findByEmail(email)
                .map(user -> User.withUsername(user.getId().toString())
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
