package com.ironmind.common.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Identity settings of the API.
 *
 * <p>The identity is produced by the edge layer: the gateway authenticates the user and forwards
 * the identifier in the configured header. This service never authenticates the caller.
 *
 * @param userUuidHeader name of the header that carries the owner identifier
 */
@ConfigurationProperties(prefix = "app.security.identity")
public record IdentityProperties(String userUuidHeader) {

    /**
     * Header used when no name is configured.
     */
    public static final String DEFAULT_USER_UUID_HEADER = "X-User-UUID";

    public IdentityProperties {
        if (userUuidHeader == null || userUuidHeader.isBlank()) {
            userUuidHeader = DEFAULT_USER_UUID_HEADER;
        }
    }
}
