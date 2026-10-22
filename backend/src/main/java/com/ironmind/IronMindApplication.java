package com.ironmind;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Entry point of the IronMind AI backend.
 *
 * <p>The API is versioned under {@code /api/v1}. Flyway owns the database schema;
 * Hibernate is configured with {@code ddl-auto: none} so the JPA model never
 * mutates the schema behind the migration history.
 *
 * <p>The API is stateless and authenticates with bearer tokens, so the default
 * in memory user of Spring Boot is not used and its auto configuration is
 * disabled.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class IronMindApplication {

    public static void main(String[] args) {
        SpringApplication.run(IronMindApplication.class, args);
    }
}
