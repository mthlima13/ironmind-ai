package com.ironmind.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ironmind.auth.entity.RefreshToken;
import com.ironmind.auth.exception.InvalidRefreshTokenException;
import com.ironmind.auth.repository.RefreshTokenRepository;
import com.ironmind.auth.token.OpaqueTokenService;
import com.ironmind.common.config.JwtProperties;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    private static final long REFRESH_TTL_SECONDS = 2_592_000L;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private RefreshTokenRevocationService revocationService;

    private OpaqueTokenService opaqueTokenService;

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        opaqueTokenService = new OpaqueTokenService();
        refreshTokenService = new RefreshTokenService(refreshTokenRepository, revocationService, opaqueTokenService,
                new JwtProperties("a-secret-long-enough-for-the-tests", 900, REFRESH_TTL_SECONDS, "ironmind-ai"));
    }

    @Test
    @DisplayName("issues an opaque token of a new family and stores only its hash")
    void issuesAnOpaqueTokenOfANewFamily() {
        UUID userId = UUID.randomUUID();

        RefreshTokenService.IssuedRefreshToken issued = refreshTokenService.issueNewFamily(userId);

        assertThat(issued.plainToken()).isNotBlank().hasSize(43).doesNotContain("=", "+", "/");
        assertThat(issued.token().getUserId()).isEqualTo(userId);
        assertThat(issued.token().getFamilyId()).isNotNull();
        assertThat(issued.token().isRevoked()).isFalse();
        assertThat(issued.token().getExpiresAt()).isAfter(Instant.now().plusSeconds(REFRESH_TTL_SECONDS - 60));

        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(saved.capture());
        assertThat(saved.getValue().getTokenHash())
                .hasSize(64)
                .isEqualTo(opaqueTokenService.hash(issued.plainToken()))
                .isNotEqualTo(issued.plainToken());
    }

    @Test
    @DisplayName("rotates the presented token inside the same family")
    void rotatesThePresentedTokenInsideTheSameFamily() {
        UUID userId = UUID.randomUUID();
        UUID familyId = UUID.randomUUID();
        RefreshToken current = activeToken(userId, familyId);
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(current));

        RefreshTokenService.IssuedRefreshToken issued = refreshTokenService.rotate("presented-token");

        assertThat(issued.token().getFamilyId()).isEqualTo(familyId);
        assertThat(issued.token().getUserId()).isEqualTo(userId);
        assertThat(issued.token().isRevoked()).isFalse();
        assertThat(issued.token().getReplacedByTokenId()).isNull();

        assertThat(current.isRevoked()).isTrue();
        assertThat(current.getRevokedAt()).isNotNull();
        assertThat(current.getReplacedByTokenId()).isEqualTo(issued.token().getId());

        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("revokes the whole family when a revoked token is presented again")
    void revokesTheWholeFamilyWhenARevokedTokenIsPresentedAgain() {
        UUID userId = UUID.randomUUID();
        UUID familyId = UUID.randomUUID();
        RefreshToken reused = activeToken(userId, familyId);
        reused.revoke(Instant.now().minusSeconds(60));

        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(reused));

        assertThatThrownBy(() -> refreshTokenService.rotate("presented-token"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        verify(revocationService).revokeFamily(eq(familyId), any(Instant.class));
    }

    @Test
    @DisplayName("revokes an expired token when it is presented")
    void revokesAnExpiredTokenWhenItIsPresented() {
        UUID userId = UUID.randomUUID();
        UUID familyId = UUID.randomUUID();
        RefreshToken expired = new RefreshToken(UUID.randomUUID(), userId, familyId, "hash",
                Instant.now().minusSeconds(1), Instant.now().minusSeconds(3_600));
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> refreshTokenService.rotate("presented-token"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        verify(revocationService).revokeToken(eq(expired.getId()), any(Instant.class));
    }

    @Test
    @DisplayName("rejects a token that does not exist")
    void rejectsATokenThatDoesNotExist() {
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> refreshTokenService.rotate("presented-token"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        verify(refreshTokenRepository, never()).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("revokes the token of the logout and ignores the unknown ones")
    void revokesTheTokenOfTheLogout() {
        UUID userId = UUID.randomUUID();
        RefreshToken token = activeToken(userId, UUID.randomUUID());
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        assertThat(refreshTokenService.revoke("presented-token", userId)).isTrue();
        assertThat(token.isRevoked()).isTrue();

        assertThat(refreshTokenService.revoke("presented-token", userId)).isFalse();
        assertThat(refreshTokenService.revoke("another-token", userId)).isFalse();
    }

    @Test
    @DisplayName("does not revoke the token of another user")
    void doesNotRevokeTheTokenOfAnotherUser() {
        UUID ownerId = UUID.randomUUID();
        RefreshToken token = activeToken(UUID.randomUUID(), UUID.randomUUID());
        when(refreshTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(token));

        assertThat(refreshTokenService.revoke("presented-token", ownerId)).isFalse();
        assertThat(token.isRevoked()).isFalse();
    }

    @Test
    @DisplayName("revokes every active token of a user")
    void revokesEveryActiveTokenOfAUser() {
        UUID userId = UUID.randomUUID();
        RefreshToken first = activeToken(userId, UUID.randomUUID());
        RefreshToken second = activeToken(userId, UUID.randomUUID());
        when(refreshTokenRepository.findByUserIdAndRevokedAtIsNull(userId)).thenReturn(List.of(first, second));

        refreshTokenService.revokeAllForUser(userId);

        assertThat(first.isRevoked()).isTrue();
        assertThat(second.isRevoked()).isTrue();
        verify(refreshTokenRepository).saveAll(List.of(first, second));
    }

    private static RefreshToken activeToken(UUID userId, UUID familyId) {
        return new RefreshToken(UUID.randomUUID(), userId, familyId, "hash",
                Instant.now().plusSeconds(REFRESH_TTL_SECONDS), Instant.now());
    }
}
