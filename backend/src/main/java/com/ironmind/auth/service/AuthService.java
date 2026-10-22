package com.ironmind.auth.service;

import com.ironmind.auth.dto.AuthResponse;
import com.ironmind.auth.dto.LoginRequest;
import com.ironmind.auth.dto.LogoutRequest;
import com.ironmind.auth.dto.RefreshRequest;
import com.ironmind.auth.dto.RegisterRequest;
import com.ironmind.auth.dto.ResetPasswordRequest;
import com.ironmind.auth.exception.EmailAlreadyInUseException;
import com.ironmind.auth.exception.InvalidCredentialsException;
import com.ironmind.auth.exception.InvalidRefreshTokenException;
import com.ironmind.auth.mail.RecoveryMailSender;
import com.ironmind.auth.security.JwtService;
import com.ironmind.common.idempotency.IdempotencyService;
import com.ironmind.common.security.AuthenticatedUser;
import com.ironmind.user.entity.PreferredUnits;
import com.ironmind.user.entity.TrainingExperience;
import com.ironmind.user.entity.TrainingGoal;
import com.ironmind.user.entity.User;
import com.ironmind.user.entity.UserPreferences;
import com.ironmind.user.entity.UserRole;
import com.ironmind.user.repository.UserPreferencesRepository;
import com.ironmind.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rules of the authentication flow.
 *
 * <p>The service owns the anti enumeration rules: an unknown e-mail and a wrong password answer
 * exactly the same thing, and the recovery request always answers the same, no matter whether
 * the account exists (SPEC.md section 7.7).
 *
 * <p>The account, the default preferences and the first family of refresh tokens are created in
 * the same transaction: if any of the steps fails, nothing is written.
 */
@Service
public class AuthService {

    /**
     * Scope of the idempotency keys of the registration.
     */
    private static final String REGISTER_SCOPE = "POST /api/v1/auth/register";

    /**
     * Prefix of the sentinel owner used by the registration, since the user is not authenticated
     * yet.
     */
    private static final String REGISTER_SCOPE_PREFIX = "register:";

    /**
     * Timezone used when the registration does not inform one.
     */
    private static final String DEFAULT_TIMEZONE = "America/Sao_Paulo";

    /**
     * Number of days of training of the default preferences.
     */
    private static final short DEFAULT_TRAINING_DAYS = 3;

    /**
     * Password hashed at startup and compared against when the informed e-mail does not exist.
     *
     * <p>It keeps the time of the answer of the login the same in both cases, so the response
     * does not reveal whether the e-mail is registered.
     */
    private static final String DUMMY_PASSWORD = "ironmind-nonexistent-account";

    private final UserRepository userRepository;
    private final UserPreferencesRepository userPreferencesRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordResetService passwordResetService;
    private final IdempotencyService idempotencyService;
    private final RecoveryMailSender recoveryMailSender;

    private final String dummyPasswordHash;

    public AuthService(UserRepository userRepository, UserPreferencesRepository userPreferencesRepository,
            PasswordEncoder passwordEncoder, JwtService jwtService, RefreshTokenService refreshTokenService,
            PasswordResetService passwordResetService, IdempotencyService idempotencyService,
            RecoveryMailSender recoveryMailSender) {
        this.userRepository = userRepository;
        this.userPreferencesRepository = userPreferencesRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.passwordResetService = passwordResetService;
        this.idempotencyService = idempotencyService;
        this.recoveryMailSender = recoveryMailSender;
        this.dummyPasswordHash = passwordEncoder.encode(DUMMY_PASSWORD);
    }

    /**
     * Creates an account and opens the first session.
     *
     * <p>When the {@code Idempotency-Key} header is informed, a replay with the same payload
     * returns the account created by the first request instead of creating a new one.
     *
     * @param request         payload of the registration
     * @param idempotencyKey  key of the operation, optional
     */
    @Transactional
    public RegistrationResult register(RegisterRequest request, String idempotencyKey) {
        String email = normalizeEmail(request.email());
        String name = request.name().trim();
        String timezone = normalizeTimezone(request.timezone());
        String fingerprint = IdempotencyService.fingerprint(request.canonicalPayload());

        Optional<UUID> replayedAccount = findReplayedAccount(idempotencyKey, email, fingerprint);
        if (replayedAccount.isPresent()) {
            User user = userRepository.findById(replayedAccount.get())
                    .orElseThrow(() -> new IllegalStateException(
                            "The account of the idempotency key does not exist anymore."));
            return new RegistrationResult(openSession(user), false);
        }

        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new EmailAlreadyInUseException("Este e-mail já está cadastrado.");
        }

        User user = new User(UUID.randomUUID(), name, email, passwordEncoder.encode(request.password()),
                UserRole.USER, timezone);
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            throw new EmailAlreadyInUseException("Este e-mail já está cadastrado.");
        }

        userPreferencesRepository.save(new UserPreferences(
                UUID.randomUUID(),
                user.getId(),
                PreferredUnits.KG,
                TrainingExperience.BEGINNER,
                TrainingGoal.GENERAL,
                List.of(),
                DEFAULT_TRAINING_DAYS,
                Map.of()));

        RefreshTokenService.IssuedRefreshToken issued = refreshTokenService.issueNewFamily(user.getId());

        idempotencyService.rememberAfterCommit(REGISTER_SCOPE, idempotencyKey, registerScopeOwner(email),
                fingerprint, user.getId());

        return new RegistrationResult(toAuthResponse(user, issued.plainToken()), true);
    }

    /**
     * Authenticates a user and opens a new family of refresh tokens.
     *
     * @param request payload of the login
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        Optional<User> candidate = userRepository.findByEmailIgnoreCase(email);

        if (candidate.isEmpty()) {
            passwordEncoder.matches(request.password(), dummyPasswordHash);
            throw new InvalidCredentialsException("E-mail ou senha inválidos.");
        }

        User user = candidate.get();
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("E-mail ou senha inválidos.");
        }

        RefreshTokenService.IssuedRefreshToken issued = refreshTokenService.issueNewFamily(user.getId());
        return toAuthResponse(user, issued.plainToken());
    }

    /**
     * Renews a session, rotating the refresh token.
     *
     * @param request payload of the renewal
     */
    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        RefreshTokenService.IssuedRefreshToken issued = refreshTokenService.rotate(request.refreshToken());
        User user = userRepository.findById(issued.token().getUserId())
                .orElseThrow(() -> new InvalidRefreshTokenException("Sessão expirada. Entre novamente."));
        return toAuthResponse(user, issued.plainToken());
    }

    /**
     * Revokes the refresh token presented by the client.
     *
     * @param request payload of the logout
     * @param ownerId owner of the session, {@code null} when the request is anonymous
     */
    @Transactional
    public void logout(LogoutRequest request, UUID ownerId) {
        refreshTokenService.revoke(request.refreshToken(), ownerId);
    }

    /**
     * Starts the recovery of the access.
     *
     * <p>The method never fails because of an unknown e-mail: the answer of the endpoint is the
     * same in both cases, so the API does not confirm which addresses are registered.
     *
     * @param email e-mail informed by the user
     */
    public void requestPasswordReset(String email) {
        String normalized = normalizeEmail(email);
        userRepository.findByEmailIgnoreCase(normalized).ifPresent(user -> {
            PasswordResetService.IssuedResetToken issued = passwordResetService.issue(user.getId());
            recoveryMailSender.sendPasswordReset(normalized, issued.plainToken());
        });
    }

    /**
     * Concludes the recovery of the access.
     *
     * @param request payload of the recovery
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        passwordResetService.consume(request.token(), request.newPassword());
    }

    /**
     * Result of the registration.
     *
     * @param response answer of the endpoint
     * @param created  {@code true} when the account was created by this request
     */
    public record RegistrationResult(AuthResponse response, boolean created) {
    }

    private Optional<UUID> findReplayedAccount(String idempotencyKey, String email, String fingerprint) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty();
        }
        return idempotencyService.findExistingResource(REGISTER_SCOPE, idempotencyKey, registerScopeOwner(email),
                fingerprint);
    }

    /**
     * Owner used to scope the idempotency keys of the registration.
     *
     * <p>The user is not authenticated yet, so the key is scoped by the normalized e-mail
     * instead of by the account.
     */
    private static UUID registerScopeOwner(String email) {
        return UUID.nameUUIDFromBytes((REGISTER_SCOPE_PREFIX + email).getBytes(StandardCharsets.UTF_8));
    }

    private AuthResponse openSession(User user) {
        RefreshTokenService.IssuedRefreshToken issued = refreshTokenService.issueNewFamily(user.getId());
        return toAuthResponse(user, issued.plainToken());
    }

    private AuthResponse toAuthResponse(User user, String refreshToken) {
        AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getEmail(), user.getRole());
        String accessToken = jwtService.generateAccessToken(principal);
        return new AuthResponse(
                accessToken,
                refreshToken,
                AuthResponse.BEARER,
                jwtService.accessTokenTtlSeconds(),
                new AuthResponse.AuthUser(user.getId(), user.getName(), user.getEmail(), user.getRole()));
    }

    /**
     * Normalizes the e-mail of the requests: trimmed and in lower case.
     */
    private static String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeTimezone(String timezone) {
        if (timezone == null || timezone.isBlank()) {
            return DEFAULT_TIMEZONE;
        }
        return timezone.trim();
    }
}
