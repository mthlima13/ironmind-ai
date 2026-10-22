package com.ironmind.auth.service;

import com.ironmind.auth.entity.PasswordResetToken;
import com.ironmind.auth.exception.InvalidResetTokenException;
import com.ironmind.auth.repository.PasswordResetTokenRepository;
import com.ironmind.auth.token.OpaqueTokenService;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.user.entity.User;
import com.ironmind.user.repository.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Issues and consumes the tokens of the password recovery flow.
 *
 * <p>The token is single use and lives for 30 minutes. Using it changes the password and
 * revokes every refresh token of the user, because recovering the access ends the open
 * sessions (SPEC.md section 7.7).
 */
@Service
public class PasswordResetService {

    /**
     * Lifetime of the recovery token.
     */
    private static final Duration TOKEN_TTL = Duration.ofMinutes(30);

    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final OpaqueTokenService opaqueTokenService;

    public PasswordResetService(PasswordResetTokenRepository passwordResetTokenRepository,
            UserRepository userRepository, PasswordEncoder passwordEncoder,
            RefreshTokenService refreshTokenService, OpaqueTokenService opaqueTokenService) {
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
        this.opaqueTokenService = opaqueTokenService;
    }

    /**
     * Issues a recovery token for a user.
     *
     * @param userId owner of the account
     * @return the plain token, which only exists in the e-mail and in the answer of the API
     */
    @Transactional
    public IssuedResetToken issue(UUID userId) {
        Instant now = Instant.now();
        String plainToken = opaqueTokenService.generate();
        PasswordResetToken token = new PasswordResetToken(
                UUID.randomUUID(),
                userId,
                opaqueTokenService.hash(plainToken),
                now.plus(TOKEN_TTL),
                now);
        passwordResetTokenRepository.save(token);
        return new IssuedResetToken(plainToken, token);
    }

    /**
     * Consumes a recovery token and applies the new password.
     *
     * @param plainToken  plain value of the token presented by the client
     * @param newPassword new password, already validated by the DTO
     * @throws InvalidResetTokenException when the token is unknown, expired or already used
     */
    @Transactional
    public void consume(String plainToken, String newPassword) {
        Instant now = Instant.now();
        PasswordResetToken token = findByPlainToken(plainToken);

        if (token.isUsed()) {
            throw new InvalidResetTokenException("Token de recuperação inválido ou expirado.");
        }
        if (token.isExpired(now)) {
            throw new InvalidResetTokenException("Token de recuperação inválido ou expirado.");
        }

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("usuário", token.getUserId()));
        user.updatePassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.markUsed(now);
        passwordResetTokenRepository.save(token);

        refreshTokenService.revokeAllForUser(user.getId());
    }

    private PasswordResetToken findByPlainToken(String plainToken) {
        if (plainToken == null || plainToken.isBlank()) {
            throw new InvalidResetTokenException("Token de recuperação inválido ou expirado.");
        }
        return passwordResetTokenRepository.findByTokenHash(opaqueTokenService.hash(plainToken))
                .orElseThrow(() -> new InvalidResetTokenException("Token de recuperação inválido ou expirado."));
    }

    /**
     * Result of the issuance of a recovery token.
     *
     * @param plainToken the plain value of the token, sent by e-mail
     * @param token      the persisted row of the token
     */
    public record IssuedResetToken(String plainToken, PasswordResetToken token) {
    }
}
