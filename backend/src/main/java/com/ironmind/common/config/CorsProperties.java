package com.ironmind.common.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cross origin settings of the API.
 *
 * @param allowedOrigins origins allowed to call the API; it must be restricted to the published
 *                        mobile application and to the local development clients
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {

    public CorsProperties {
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
    }
}
