package com.ironmind.auth.token;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.stereotype.Service;

/**
 * Generates and hashes the opaque tokens of the API.
 *
 * <p>The refresh token and the password reset token are credentials, not documents: they carry
 * no claim and the server trusts nothing in them. They are random values of 256 bits, encoded
 * with the URL safe Base64 alphabet without padding, so they can travel in a JSON body without
 * any escaping.
 *
 * <p>Only the SHA-256 hash of the token is stored (SPEC.md section 14.1): a leak of the
 * database does not grant access to any session.
 */
@Service
public class OpaqueTokenService {

    /**
     * Number of random bytes of every token.
     */
    private static final int TOKEN_BYTES = 32;

    private static final SecureRandom RANDOM = new SecureRandom();

    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();

    /**
     * Generates a new opaque token.
     */
    public String generate() {
        byte[] raw = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(raw);
        return ENCODER.encodeToString(raw);
    }

    /**
     * Builds the hexadecimal SHA-256 hash of a token, the value stored in the database.
     */
    public String hash(String token) {
        if (token == null) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is not available in this JVM.", ex);
        }
    }
}
