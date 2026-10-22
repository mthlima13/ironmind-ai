package com.ironmind.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ironmind.auth.entity.PasswordResetToken;
import com.ironmind.auth.exception.InvalidResetTokenException;
import com.ironmind.auth.repository.PasswordResetTokenRepository;
import com.ironmind.auth.token.OpaqueTokenService;
import com.ironmind.user.entity.User;
import com.ironmind.user.entity.UserRole;
import com.ironmind.user.repository.UserRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private RefreshTokenService refreshTokenService;

    private OpaqueTokenService opaqueTokenService;

    private PasswordResetService passwordResetService;

    @BeforeEach
    void setUp() {
        opaqueTokenService = new OpaqueTokenService();
        passwordResetService = new PasswordResetService(passwordResetTokenRepository, userRepository, passwordEncoder,
                refreshTokenService, opaqueTokenService);
    }

    @Test
    @DisplayName("issues a single use token that lives for thirty minutes")
    void issuesASingleUseToken() {
        UUID userId = UUID.randomUUID();

        PasswordResetService.IssuedResetToken issued = passwordResetService.issue(userId);

        assertThat(issued.plainToken()).isNotBlank().hasSize(43);

        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(saved.capture());
        PasswordResetToken token = saved.getValue();
        assertThat(token.getUserId()).isEqualTo(userId);
        assertThat(token.getUsedAt()).isNull();
        assertThat(token.isUsed()).isFalse();
        assertThat(token.getExpiresAt()).isBetween(Instant.now().plusSeconds(29 * 60),
                Instant.now().plusSeconds(31 * 60));
        assertThat(token.getTokenHash())
                .hasSize(64)
                .isEqualTo(opaqueTokenService.hash(issued.plainToken()))
                .isNotEqualTo(issued.plainToken());
    }

    @Test
    @DisplayName("changes the password and revokes every session of the user")
    void changesThePasswordAndRevokesEverySessionOfTheUser() {
        User user = user("ana@example.com");
        PasswordResetToken token = activeToken(user.getId());
        when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("nova-senha1")).thenReturn("new-argon2id-hash");

        passwordResetService.consume("presented-token", "nova-senha1");

        assertThat(user.getPasswordHash()).isEqualTo("new-argon2id-hash");
        assertThat(token.isUsed()).isTrue();
        assertThat(token.getUsedAt()).isNotNull();
        verify(refreshTokenService).revokeAllForUser(user.getId());
    }

    @Test
    @DisplayName("rejects a token that was already used")
    void rejectsATokenThatWasAlreadyUsed() {
        User user = user("ana@example.com");
        PasswordResetToken token = activeToken(user.getId());
        token.markUsed(Instant.now().minusSeconds(30));
        when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> passwordResetService.consume("presented-token", "nova-senha1"))
                .isInstanceOf(InvalidResetTokenException.class);

        assertThat(user.getPasswordHash()).isEqualTo("old-hash");
        verify(refreshTokenService, never()).revokeAllForUser(any());
    }

    @Test
    @DisplayName("rejects an expired token")
    void rejectsAnExpiredToken() {
        PasswordResetToken token = new PasswordResetToken(UUID.randomUUID(), UUID.randomUUID(), "hash",
                Instant.now().minusSeconds(1), Instant.now().minusSeconds(3_600));
        when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> passwordResetService.consume("presented-token", "nova-senha1"))
                .isInstanceOf(InvalidResetTokenException.class);

        verify(userRepository, never()).findById(any());
        verify(refreshTokenService, never()).revokeAllForUser(any());
    }

    @Test
    @DisplayName("rejects a token that does not exist")
    void rejectsATokenThatDoesNotExist() {
        when(passwordResetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> passwordResetService.consume("presented-token", "nova-senha1"))
                .isInstanceOf(InvalidResetTokenException.class);

        verify(passwordResetTokenRepository, never()).save(any(PasswordResetToken.class));
    }

    private static User user(String email) {
        return new User(UUID.randomUUID(), "Ana Souza", email, "old-hash", UserRole.USER, "America/Sao_Paulo");
    }

    private static PasswordResetToken activeToken(UUID userId) {
        return new PasswordResetToken(UUID.randomUUID(), userId, "hash", Instant.now().plusSeconds(1_800),
                Instant.now());
    }
}
