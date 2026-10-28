package com.ironmind.common.security;

import com.ironmind.common.ErrorCode;
import com.ironmind.common.config.CorsProperties;
import com.ironmind.common.web.ApiErrorWriter;
import jakarta.annotation.PostConstruct;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Security rules of the API.
 *
 * <p>The service does not authenticate: the gateway validates the session and forwards the owner
 * identifier in a header, read by {@link IdentityHeaderFilter}. This configuration only decides
 * which routes require an identity and who owns each resource.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final String[] PUBLIC_ENDPOINTS = {
            "/api/v1/health",
            "/v3/api-docs",
            "/v3/api-docs/**",
            "/swagger-ui.html",
            "/swagger-ui/**",
            "/actuator/health",
            "/actuator/health/**",
            "/actuator/info",
            "/error"
    };

    private final IdentityHeaderFilter identityHeaderFilter;
    private final ApiErrorWriter apiErrorWriter;
    private final CorsProperties corsProperties;

    public SecurityConfig(IdentityHeaderFilter identityHeaderFilter, ApiErrorWriter apiErrorWriter,
            CorsProperties corsProperties) {
        this.identityHeaderFilter = identityHeaderFilter;
        this.apiErrorWriter = apiErrorWriter;
        this.corsProperties = corsProperties;
    }

    @PostConstruct
    public void validateProductionConfiguration() {
        String activeProfile = System.getenv("SPRING_PROFILES_ACTIVE");
        if (activeProfile == null || !activeProfile.contains("production")) {
            return;
        }
        if (corsProperties.allowedOrigins() == null || corsProperties.allowedOrigins().isEmpty()
                || corsProperties.allowedOrigins().stream().anyMatch(o -> o.contains("localhost"))) {
            throw new IllegalStateException("CORS_ALLOWED_ORIGINS must be configured for production");
        }
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .contentTypeOptions(org.springframework.security.config.Customizer.withDefaults())
                        .frameOptions(frame -> frame.deny())
                        .referrerPolicy(referrer -> referrer
                                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000))
                        .permissionsPolicy(permissions -> permissions
                                .policy("camera=(), microphone=(), geolocation=()")))
                .authorizeHttpRequests(requests -> requests
                        .requestMatchers(HttpMethod.GET, "/api/v1/exercises", "/api/v1/exercises/**").permitAll()
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, ex) -> apiErrorWriter.write(request, response,
                                ErrorCode.UNAUTHENTICATED, ErrorCode.UNAUTHENTICATED.defaultMessage()))
                        .accessDeniedHandler((request, response, ex) -> apiErrorWriter.write(request, response,
                                ErrorCode.FORBIDDEN, ErrorCode.FORBIDDEN.defaultMessage())))
                .addFilterBefore(identityHeaderFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(corsProperties.allowedOrigins());
        configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key", "X-Trace-Id"));
        configuration.setExposedHeaders(List.of("X-Trace-Id"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
