package com.ironmind.auth.security;

import com.ironmind.common.config.JwtProperties;
import com.ironmind.common.security.AuthenticatedUser;
import com.ironmind.user.entity.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Issues and validates the JWT tokens of the API.
 *
 * <p>The access token carries the user identifier and the role, exactly as required by
 * SPEC.md section 14.1. The refresh token is issued with the same secret but with a dedicated
 * token type, so an access token can never be used to renew a session.
 *
 * <p><strong>Pending decision:</strong> SPEC.md section 20, decision 2, still has to define the
 * final token strategy (stateless JWT versus session, refresh rotation and revocation). The
 * implementation below is the stateless baseline assumed by the specification appendix A.4.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private static final String CLAIM_ROLE = "role";
    private static final String CLAIM_EMAIL = "email";
    private static final String CLAIM_TOKEN_TYPE = "tokenType";
    private static final String TOKEN_TYPE_ACCESS = "access";
    private static final String TOKEN_TYPE_REFRESH = "refresh";
    private static final String ALGORITHM = "HmacSHA256";

    private final JwtProperties properties;
    private final SecretKey signingKey;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        this.signingKey = new SecretKeySpec(deriveKey(properties.secret()), ALGORITHM);
        if (properties.usesDefaultSecret()) {
            log.warn("""

                    ==================================================================================
                    SECURITY WARNING: JWT_SECRET is using the default development value.
                    Every token issued by this instance is signed with a public secret, so anyone
                    can forge an access token. Set the JWT_SECRET environment variable to a random
                    value of 32 bytes or more before running this application anywhere else.
                    Example: openssl rand -base64 48
                    ==================================================================================
                    """);
        }
    }

    /**
     * Issues an access token for the given user.
     */
    public String generateAccessToken(AuthenticatedUser user) {
        return generateToken(user, TOKEN_TYPE_ACCESS, properties.ttlSeconds());
    }

    /**
     * Issues a refresh token for the given user.
     */
    public String generateRefreshToken(AuthenticatedUser user) {
        return generateToken(user, TOKEN_TYPE_REFRESH, properties.refreshTtlSeconds());
    }

    /**
     * Validates an access token and extracts the authenticated user.
     */
    public Optional<AuthenticatedUser> parseAccessToken(String token) {
        return parse(token, TOKEN_TYPE_ACCESS)
                .map(claims -> new AuthenticatedUser(
                        UUID.fromString(claims.getSubject()),
                        claims.get(CLAIM_EMAIL, String.class),
                        UserRole.valueOf(claims.get(CLAIM_ROLE, String.class))));
    }

    /**
     * Validates a refresh token and extracts the user identifier.
     */
    public Optional<UUID> parseRefreshToken(String token) {
        return parse(token, TOKEN_TYPE_REFRESH).map(claims -> UUID.fromString(claims.getSubject()));
    }

    /**
     * Lifetime of the access token, in seconds.
     */
    public long accessTokenTtlSeconds() {
        return properties.ttlSeconds();
    }

    /**
     * Lifetime of the refresh token, in seconds.
     */
    public long refreshTokenTtlSeconds() {
        return properties.refreshTtlSeconds();
    }

    private String generateToken(AuthenticatedUser user, String tokenType, long ttlSeconds) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plusSeconds(ttlSeconds);
        return Jwts.builder()
                .subject(user.userId().toString())
                .issuer(properties.issuer())
                .id(UUID.randomUUID().toString())
                .claim(CLAIM_EMAIL, user.email())
                .claim(CLAIM_ROLE, user.role().name())
                .claim(CLAIM_TOKEN_TYPE, tokenType)
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    private Optional<Claims> parse(String token, String expectedTokenType) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .requireIssuer(properties.issuer())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            String tokenType = claims.get(CLAIM_TOKEN_TYPE, String.class);
            if (!expectedTokenType.equals(tokenType)) {
                return Optional.empty();
            }
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Rejected JWT token: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Derives a fixed size signing key from the configured secret.
     *
     * <p>The digest keeps the application bootable with any secret length, including the
     * development placeholder, instead of failing with an opaque key length error.
     */
    private static byte[] deriveKey(String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().parseHex(HexFormat.of().formatHex(digest.digest(secret.getBytes(StandardCharsets.UTF_8))));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Algoritmo SHA-256 indisponível na JVM.", ex);
        }
    }

}
