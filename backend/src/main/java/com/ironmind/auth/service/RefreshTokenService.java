package com.ironmind.auth.service;

import com.ironmind.auth.entity.RefreshToken;
import com.ironmind.auth.exception.InvalidRefreshTokenException;
import com.ironmind.auth.repository.RefreshTokenRepository;
import com.ironmind.auth.token.OpaqueTokenService;
import com.ironmind.common.config.JwtProperties;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Issues, rotates and revokes the refresh tokens of the API.
 *
 * <p>The refresh token is an opaque credential stored only as a SHA-256 hash. Every login opens
 * a new family of tokens; every renewal revokes the presented token and issues a new one in the
 * same family. Presenting a token that was already revoked is treated as a theft: the whole
 * family is revoked (SPEC.md section 14.1).
 */
@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final RefreshTokenRevocationService revocationService;
    private final OpaqueTokenService opaqueTokenService;
    private final JwtProperties jwtProperties;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository,
            RefreshTokenRevocationService revocationService, OpaqueTokenService opaqueTokenService,
            JwtProperties jwtProperties) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.revocationService = revocationService;
        this.opaqueTokenService = opaqueTokenService;
        this.jwtProperties = jwtProperties;
    }

    /**
     * Opens a new family of tokens for a login.
     *
     * @param userId owner of the session
     * @return the plain token, which only exists in the answer of the API, and its persisted row
     */
    @Transactional
    public IssuedRefreshToken issueNewFamily(UUID userId) {
        return issue(userId, UUID.randomUUID());
    }

    /**
     * Renews a session: the presented token is revoked and replaced by a new one of the same
     * family.
     *
     * @param presentedToken plain value of the token presented by the client
     * @throws InvalidRefreshTokenException when the token is unknown, expired or already revoked
     */
    @Transactional
    public IssuedRefreshToken rotate(String presentedToken) {
        Instant now = Instant.now();
        RefreshToken current = findByPlainToken(presentedToken);

        if (current.isRevoked()) {
            revocationService.revokeFamily(current.getFamilyId(), now);
            throw new InvalidRefreshTokenException("Sessão expirada. Entre novamente.");
        }

        if (current.isExpired(now)) {
            revocationService.revokeToken(current.getId(), now);
            throw new InvalidRefreshTokenException("Sessão expirada. Entre novamente.");
        }

        IssuedRefreshToken issued = issue(current.getUserId(), current.getFamilyId());
        current.revoke(now);
        current.replaceWith(issued.token().getId());
        refreshTokenRepository.save(current);
        return issued;
    }

    /**
     * Revokes the presented token.
     *
     * <p>The operation is idempotent: revoking a token that was already revoked is not an error.
     * When the request carries an authenticated user, a token of another user is left untouched.
     *
     * @param presentedToken plain value of the token presented by the client
     * @param ownerId        owner of the session, {@code null} when the request is anonymous
     * @return {@code true} when the token was revoked by this call
     */
    @Transactional
    public boolean revoke(String presentedToken, UUID ownerId) {
        if (presentedToken == null || presentedToken.isBlank()) {
            return false;
        }
        Optional<RefreshToken> found = refreshTokenRepository
                .findByTokenHash(opaqueTokenService.hash(presentedToken));
        if (found.isEmpty()) {
            return false;
        }
        RefreshToken token = found.get();
        if (ownerId != null && !ownerId.equals(token.getUserId())) {
            return false;
        }
        if (token.isRevoked()) {
            return false;
        }
        token.revoke(Instant.now());
        refreshTokenRepository.save(token);
        return true;
    }

    /**
     * Revokes every active token of a user, used when the password is recovered.
     *
     * @param userId owner of the sessions
     */
    @Transactional
    public void revokeAllForUser(UUID userId) {
        Instant now = Instant.now();
        List<RefreshToken> tokens = refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId);
        for (RefreshToken token : tokens) {
            token.revoke(now);
        }
        refreshTokenRepository.saveAll(tokens);
    }

    private IssuedRefreshToken issue(UUID userId, UUID familyId) {
        Instant now = Instant.now();
        String plainToken = opaqueTokenService.generate();
        RefreshToken token = new RefreshToken(
                UUID.randomUUID(),
                userId,
                familyId,
                opaqueTokenService.hash(plainToken),
                now.plusSeconds(jwtProperties.refreshTtlSeconds()),
                now);
        refreshTokenRepository.save(token);
        return new IssuedRefreshToken(plainToken, token);
    }

    private RefreshToken findByPlainToken(String presentedToken) {
        if (presentedToken == null || presentedToken.isBlank()) {
            throw new InvalidRefreshTokenException("Sessão expirada. Entre novamente.");
        }
        return refreshTokenRepository.findByTokenHash(opaqueTokenService.hash(presentedToken))
                .orElseThrow(() -> new InvalidRefreshTokenException("Sessão expirada. Entre novamente."));
    }

    /**
     * Result of the issuance of a refresh token.
     *
     * @param plainToken the plain value of the token, returned to the client only
     * @param token      the persisted row of the token
     */
    public record IssuedRefreshToken(String plainToken, RefreshToken token) {
    }
}
