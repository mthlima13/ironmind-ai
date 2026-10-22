package com.ironmind.auth.repository;

import com.ironmind.auth.entity.PasswordResetToken;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
