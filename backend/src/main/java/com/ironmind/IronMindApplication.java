package com.ironmind;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Entry point of the IronMind AI backend.
 *
 * <p>The API is versioned under {@code /api/v1}. The documents of the domain declare their own
 * indexes, which are created on startup; the exercises of the global catalog are seeded from
 * {@code catalog/exercises.json} in an idempotent way.
 *
 * <p>The API is stateless and receives the owner identifier from the gateway, so the
 * default in memory user of Spring Boot is not used and its auto configuration is
 * disabled.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class IronMindApplication {

    public static void main(String[] args) {
        SpringApplication.run(IronMindApplication.class, args);
    }
}
