package com.ironmind.workout.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.ironmind.common.exception.ConflictException;
import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.common.exception.IdempotencyKeyReusedException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.record.service.PersonalRecordService;
import com.ironmind.workout.dto.ExerciseSetResponse;
import com.ironmind.workout.dto.RegisterSetRequest;
import com.ironmind.workout.dto.UpdateSetRequest;
import com.ironmind.workout.entity.ExerciseSet;
import com.ironmind.workout.entity.SessionExercise;
import com.ironmind.workout.entity.WorkoutSession;
import com.ironmind.workout.repository.ExerciseSetRepository;
import com.ironmind.workout.repository.SessionExerciseRepository;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rules of the sets registered inside a session (SPEC.md section 7.8).
 *
 * <p>The service owns the number of the set: it is the position of the series inside the
 * exercise of the session, and it is assigned by the server, never by the body of the request.
 *
 * <p>The service also owns the durable idempotency of the registration. The key lives in the set
 * itself, in a column with a unique index, so the mechanism survives a restart of the server and
 * is not shared by the instances of the API (SPEC.md section 7.8 and appendix A.3).
 */
@Service
@Transactional(readOnly = true)
public class ExerciseSetService {

    /**
     * Scope of the idempotency keys of the registration of a set.
     */
    private static final String REGISTER_SCOPE = "POST /api/v1/workout-sessions/{id}/sets";

    private final ExerciseSetRepository exerciseSetRepository;
    private final SessionExerciseRepository sessionExerciseRepository;
    private final WorkoutSessionService workoutSessionService;
    private final PersonalRecordService personalRecordService;

    public ExerciseSetService(ExerciseSetRepository exerciseSetRepository,
            SessionExerciseRepository sessionExerciseRepository, WorkoutSessionService workoutSessionService,
            PersonalRecordService personalRecordService) {
        this.exerciseSetRepository = exerciseSetRepository;
        this.sessionExerciseRepository = sessionExerciseRepository;
        this.workoutSessionService = workoutSessionService;
        this.personalRecordService = personalRecordService;
    }

    /**
     * Registers a set inside an exercise of a session of the user.
     *
     * <p>The number of the set is the position of the series inside the exercise of the session,
     * so it is assigned by the server. The idempotency key is durable: a replay with the same key
     * and the same body returns the series already registered, and a replay with a different body
     * is a conflict (SPEC.md section 7.8 and appendix A.3).
     *
     * @throws ResourceNotFoundException when the session does not exist, belongs to another user or
     *                                   when the exercise of the session does not belong to it
     * @throws ConflictException          when the session is finished
     * @throws IdempotencyKeyReusedException when the key was already used with a different body
     */
    @Transactional
    public RegistrationResult register(UUID sessionId, RegisterSetRequest request, UUID userId,
            String idempotencyKey) {
        WorkoutSession session = workoutSessionService.requireOwnedSession(sessionId, userId);

        if (session.isFinalized()) {
            throw new ConflictException("A sessão já foi finalizada e não aceita novas séries.");
        }

        SessionExercise sessionExercise = sessionExerciseRepository
                .findByIdAndSessionId(request.sessionExerciseId(), sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("exercício da sessão",
                        request.sessionExerciseId()));

        String key = scopedKey(userId, idempotencyKey);
        if (key != null) {
            Optional<ExerciseSet> existing = exerciseSetRepository.findByIdempotencyKey(key);
            if (existing.isPresent()) {
                ExerciseSet registered = existing.get();
                if (!matches(registered, sessionId, request)) {
                    throw new IdempotencyKeyReusedException(
                            "A chave de idempotência já foi utilizada com um conteúdo diferente.");
                }
                return new RegistrationResult(ExerciseSetResponse.from(registered), false);
            }
        }

        int setNumber = exerciseSetRepository.findMaxSetNumber(sessionExercise.getId()) + 1;

        ExerciseSet set = new ExerciseSet(UUID.randomUUID(), sessionExercise, setNumber, request.weightKg(),
                request.repetitions(), request.durationSeconds(), request.distanceMeters(),
                request.perceivedExertion(), request.restAfterSeconds(), key);

        ExerciseSet saved = exerciseSetRepository.save(set);
        personalRecordService.recalculate(userId, sessionExercise.getExercise().getId());
        return new RegistrationResult(ExerciseSetResponse.from(saved), true);
    }

    /**
     * Corrects a set already registered.
     *
     * <p>The correction keeps the identifier and the number of the set, so the link with the
     * history is never broken (SPEC.md section 7.8).
     *
     * @throws ResourceNotFoundException when the set does not exist or belongs to another user
     * @throws ConflictException          when the session of the set is finished
     */
    @Transactional
    public ExerciseSetResponse update(UUID setId, UpdateSetRequest request, UUID userId) {
        ExerciseSet set = requireOwnedSet(setId, userId);
        if (set.getSessionExercise().getSession().isFinalized()) {
            throw new ConflictException("A sessão já foi finalizada e não aceita correções das séries.");
        }

        set.update(
                weightOf(request, set),
                request.repetitions() == null ? set.getRepetitions() : request.repetitions(),
                request.durationSeconds() == null ? set.getDurationSeconds() : request.durationSeconds(),
                request.distanceMeters() == null ? set.getDistanceMeters() : request.distanceMeters(),
                request.perceivedExertion() == null ? set.getPerceivedExertion() : request.perceivedExertion(),
                request.restAfterSeconds() == null ? set.getRestAfterSeconds() : request.restAfterSeconds());

        ExerciseSet saved = exerciseSetRepository.save(set);
        personalRecordService.recalculate(userId, set.getSessionExercise().getExercise().getId());
        return ExerciseSetResponse.from(saved);
    }

    /**
     * Reads the load of the correction.
     *
     * <p>An omitted field keeps the current load; an explicit {@code null} clears it, because the
     * bodyweight movement has no load (SPEC.md section 10.9).
     *
     * @throws FieldValidationException when the value is not a valid load
     */
    private static BigDecimal weightOf(UpdateSetRequest request, ExerciseSet set) {
        JsonNode node = request.weightKg();
        if (node == null || node.isMissingNode()) {
            return set.getWeightKg();
        }
        if (node.isNull()) {
            return null;
        }
        if (!node.isNumber()) {
            throw new FieldValidationException("weightKg", "A carga deve ser um número em quilogramas.");
        }
        BigDecimal weight = node.decimalValue();
        if (weight.signum() < 0) {
            throw new FieldValidationException("weightKg", "A carga deve ser maior ou igual a zero.");
        }
        if (weight.precision() - weight.scale() > 4 || weight.scale() > 2) {
            throw new FieldValidationException("weightKg",
                    "A carga deve ter no máximo 4 dígitos e 2 casas decimais.");
        }
        return weight;
    }

    /**
     * Deletes a set of a session of the user.
     *
     * @throws ResourceNotFoundException when the set does not exist or belongs to another user
     * @throws ConflictException          when the session of the set is finished
     */
    @Transactional
    public void delete(UUID setId, UUID userId) {
        ExerciseSet set = requireOwnedSet(setId, userId);
        if (set.getSessionExercise().getSession().isFinalized()) {
            throw new ConflictException("A sessão já foi finalizada e não aceita correções das séries.");
        }
        UUID exerciseId = set.getSessionExercise().getExercise().getId();
        exerciseSetRepository.delete(set);
        // The recalculation reads the surviving sets, so the deletion has to reach the database
        // first. Without the flush the query could still see the deleted row.
        exerciseSetRepository.flush();
        personalRecordService.recalculate(userId, exerciseId);
    }

    /**
     * Loads the set of the user, or fails when it does not exist or belongs to another user.
     */
    private ExerciseSet requireOwnedSet(UUID setId, UUID userId) {
        return exerciseSetRepository.findOwnedById(setId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("série", setId));
    }

    /**
     * Normalizes the idempotency key informed by the client.
     *
     * @return the key, or {@code null} when the request does not carry one
     */
    private static String normalizedKey(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return null;
        }
        return idempotencyKey.trim();
    }

    /**
     * Builds the value stored in the set for the idempotency key.
     *
     * <p>Appendix A.3 scopes the key by the user and by the endpoint, but the column has a
     * global unique index: the scope is folded into a digest, so the key of a user never collides
     * with the key of another user and the column never overflows.
     */
    private static String scopedKey(UUID userId, String idempotencyKey) {
        String key = normalizedKey(idempotencyKey);
        if (key == null) {
            return null;
        }
        return digest(userId + "|" + REGISTER_SCOPE + "|" + key);
    }

    /**
     * Builds the SHA-256 digest of a value, in hexadecimal.
     */
    private static String digest(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Algoritmo SHA-256 indisponível na JVM.", ex);
        }
    }

    /**
     * Tells whether the registered series carries the same values of the request.
     *
     * <p>The comparison drives the conflict of the idempotency: the same key with a different
     * body is refused, and the same key with the same body replays the series.
     */
    private static boolean matches(ExerciseSet registered, UUID sessionId, RegisterSetRequest request) {
        return registered.getSessionExercise().getSession().getId().equals(sessionId)
                && registered.getSessionExercise().getId().equals(request.sessionExerciseId())
                && sameNumber(registered.getWeightKg(), request.weightKg())
                && registered.getRepetitions() == numberOf(request.repetitions())
                && sameNumber(registered.getDurationSeconds(), request.durationSeconds())
                && sameNumber(registered.getDistanceMeters(), request.distanceMeters())
                && sameNumber(registered.getPerceivedExertion(), request.perceivedExertion())
                && sameNumber(registered.getRestAfterSeconds(), request.restAfterSeconds());
    }

    /**
     * Compares two numbers, treating {@code null} as a value of its own.
     */
    private static boolean sameNumber(Number stored, Number requested) {
        if (stored == null || requested == null) {
            return stored == null && requested == null;
        }
        if (stored instanceof BigDecimal storedDecimal && requested instanceof BigDecimal requestedDecimal) {
            return storedDecimal.compareTo(requestedDecimal) == 0;
        }
        return stored.doubleValue() == requested.doubleValue();
    }

    /**
     * Reads the number of repetitions of the request, which is mandatory.
     */
    private static int numberOf(Integer repetitions) {
        return repetitions == null ? 0 : repetitions;
    }

    /**
     * Result of a registration, telling whether the series was created or replayed.
     *
     * @param set     the registered (or replayed) series
     * @param created {@code true} when the series was created by this request
     */
    public record RegistrationResult(ExerciseSetResponse set, boolean created) {
    }
}
