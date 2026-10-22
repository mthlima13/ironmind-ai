package com.ironmind.auth.repository;

import com.ironmind.auth.entity.RefreshToken;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository of the refresh tokens.
 */
@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    /**
     * Finds a token by the hash of its plain value.
     */
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Lists every token of a family, used by the reuse detection.
     */
    List<RefreshToken> findByFamilyId(UUID familyId);

    /**
     * Lists every token of a user.
     */
    List<RefreshToken> findByUserId(UUID userId);

    /**
     * Lists the tokens of a user that are still active.
     */
    List<RefreshToken> findByUserIdAndRevokedAtIsNull(UUID userId);
}
