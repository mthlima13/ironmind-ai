package com.ironmind.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JWT settings of the API.
 *
 * @param secret            signing secret, never taken from the request and never committed
 * @param ttlSeconds        lifetime of the access token, in seconds
 * @param refreshTtlSeconds lifetime of the refresh token, in seconds
 * @param issuer            value of the {@code iss} claim
 */
@ConfigurationProperties(prefix = "app.security.jwt")
public record JwtProperties(String secret, long ttlSeconds, long refreshTtlSeconds, String issuer) {

    /**
     * Placeholder used when no secret is configured. The application boots with it, but logs a
     * strong warning: it must be replaced before any real deployment.
     */
    public static final String DEFAULT_SECRET = "change-me-32-bytes-minimum";

    public JwtProperties {
        if (secret == null || secret.isBlank()) {
            secret = DEFAULT_SECRET;
        }
        if (ttlSeconds <= 0) {
            ttlSeconds = 900;
        }
        if (refreshTtlSeconds <= 0) {
            refreshTtlSeconds = 2_592_000L;
        }
        if (issuer == null || issuer.isBlank()) {
            issuer = "ironmind-ai";
        }
    }

    /**
     * Tells whether the application is running with the development placeholder secret.
     */
    public boolean usesDefaultSecret() {
        return DEFAULT_SECRET.equals(secret);
    }
}
