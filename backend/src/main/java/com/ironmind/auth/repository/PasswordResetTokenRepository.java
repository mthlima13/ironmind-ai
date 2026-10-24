package com.ironmind.auth.repository;

import com.ironmind.auth.entity.PasswordResetToken;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Repository of the password reset tokens.
 */
@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    /**
     * Finds a token by the hash of its plain value.
     */
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /**
     * Marks all unused tokens of a user as consumed so that a new request invalidates the old ones.
     */
    @Modifying
    @Query("update PasswordResetToken t set t.usedAt = :usedAt where t.userId = :userId and t.usedAt is null")
    int revokeAllUnusedForUser(@Param("userId") UUID userId, @Param("usedAt") Instant usedAt);
}
