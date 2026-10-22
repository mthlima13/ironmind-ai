package com.ironmind.auth.service;

import com.ironmind.auth.entity.RefreshToken;
import com.ironmind.auth.repository.RefreshTokenRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Revocation of the refresh tokens that must survive the failure of the request.
 *
 * <p>The reuse detection and the expiration of a token are security actions: they must be
 * persisted even though the request itself is answered with an error. The revocation therefore
 * runs in its own transaction ({@link Propagation#REQUIRES_NEW}), so the rollback of the
 * request does not undo it.
 */
@Service
public class RefreshTokenRevocationService {

    private final RefreshTokenRepository refreshTokenRepository;

    public RefreshTokenRevocationService(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    /**
     * Revokes every token of a family, used when a revoked token is presented again.
     *
     * @param familyId  family of the tokens of the session
     * @param revokedAt moment of the revocation
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeFamily(UUID familyId, Instant revokedAt) {
        List<RefreshToken> family = refreshTokenRepository.findByFamilyId(familyId);
        for (RefreshToken token : family) {
            token.revoke(revokedAt);
        }
        refreshTokenRepository.saveAll(family);
    }

    /**
     * Revokes a single token, used when an expired token is presented.
     *
     * @param tokenId   identifier of the token
     * @param revokedAt moment of the revocation
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeToken(UUID tokenId, Instant revokedAt) {
        refreshTokenRepository.findById(tokenId).ifPresent(token -> {
            token.revoke(revokedAt);
            refreshTokenRepository.save(token);
        });
    }
}
