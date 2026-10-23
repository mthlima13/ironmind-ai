package com.ironmind.common.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Clock used by the services that resolve the current period.
 *
 * <p>The time is injected instead of read from a static call so the analytics rules can be tested
 * against a known instant.
 */
@Configuration
public class TimeConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
