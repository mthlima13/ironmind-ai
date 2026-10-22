package com.ironmind.auth.password;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Password encoder of the API.
 *
 * <p>The encoder is Argon2id with the parameters recommended by OWASP (SPEC.md section 14.1):
 * memory of 19 MiB, two iterations, a single lane, a salt of 16 bytes and a hash of 32 bytes,
 * using the version 1.3 (19) of the algorithm.
 *
 * <p>The Argon2 primitives come from Bouncy Castle, which must be on the runtime classpath.
 */
@Configuration
public class PasswordEncoderConfig {

    /**
     * Length of the random salt, in bytes.
     */
    private static final int SALT_LENGTH = 16;

    /**
     * Length of the produced hash, in bytes.
     */
    private static final int HASH_LENGTH = 32;

    /**
     * Number of lanes used by the algorithm.
     */
    private static final int PARALLELISM = 1;

    /**
     * Memory used by the algorithm, in kibibytes.
     */
    private static final int MEMORY_KIB = 19_456;

    /**
     * Number of iterations of the algorithm.
     */
    private static final int ITERATIONS = 2;

    /**
     * Builds the Argon2id encoder used to hash and to verify the passwords.
     *
     * <p>The encoder of Spring Security always uses Argon2id with the version 1.3 (19) of the
     * algorithm, so only the cost parameters are informed here.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new Argon2PasswordEncoder(SALT_LENGTH, HASH_LENGTH, PARALLELISM, MEMORY_KIB, ITERATIONS);
    }
}
