package com.ironmind.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.ai.config.AiProperties;
import com.ironmind.ai.dto.LoadSuggestionRequest;
import com.ironmind.ai.dto.LoadSuggestionResponse;
import com.ironmind.ai.entity.RecommendationStatus;
import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.common.idempotency.IdempotencyService;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.user.entity.InjuryRestriction;
import com.ironmind.user.entity.User;
import com.ironmind.user.entity.UserRole;
import com.ironmind.user.repository.InjuryRestrictionRepository;
import com.ironmind.workout.entity.ExerciseSet;
import com.ironmind.workout.entity.SessionExercise;
import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import com.ironmind.workout.repository.ExerciseSetRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LoadSuggestionServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EXERCISE_ID = UUID.randomUUID();
    private static final User USER = new User(
            USER_ID, "Ana", "ana@example.com", "hash", UserRole.USER, "America/Sao_Paulo");
    private static final Exercise EXERCISE = new Exercise(
            EXERCISE_ID, "Supino reto", null, "PEITO", List.of(), "Barra", null, MovementType.COMPOUND);

    @Mock
    private ExerciseRepository exerciseRepository;
    @Mock
    private InjuryRestrictionRepository restrictionRepository;
    @Mock
    private ExerciseSetRepository setRepository;
    @Mock
    private AiRecommendationService recommendationService;
    @Mock
    private IdempotencyService idempotencyService;

    private LoadSuggestionService service;

    @BeforeEach
    void setUp() {
        service = new LoadSuggestionService(
                exerciseRepository,
                restrictionRepository,
                setRepository,
                recommendationService,
                properties(),
                idempotencyService,
                new ObjectMapper());
        lenient().when(exerciseRepository.findById(EXERCISE_ID)).thenReturn(Optional.of(EXERCISE));
        lenient().when(restrictionRepository.findByUserId(USER_ID)).thenReturn(List.of());
        lenient().when(idempotencyService.findExistingResource(anyString(), any(), any(), any()))
                .thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("does not suggest a load without history")
    void doesNotSuggestALoadWithoutHistory() {
        when(setRepository.findByUserIdAndExerciseId(USER_ID, EXERCISE_ID)).thenReturn(List.of());

        LoadSuggestionResponse response = service.suggest(USER_ID, request(8, 12), null);

        assertThat(response.rule()).isEqualTo("INSUFFICIENT_HISTORY");
        assertThat(response.confidence()).isEqualTo("LOW");
        assertThat(response.sets()).isEmpty();
        assertThat(response.sessionsConsidered()).isZero();
        assertThat(response.applied()).isFalse();
        assertThat(response.recommendationId()).isNotNull();
        assertThat(response.status()).isEqualTo(RecommendationStatus.PENDING);
    }

    @Test
    @DisplayName("increases the load after the top of the range in the last two sessions with controlled effort")
    void increasesTheLoadAfterTheTopOfTheRange() {
        when(setRepository.findByUserIdAndExerciseId(USER_ID, EXERCISE_ID)).thenReturn(history(
                session("2026-10-01T10:00:00Z", "80.00", 12, (short) 8, 1),
                session("2026-10-08T10:00:00Z", "80.00", 12, (short) 8, 1),
                session("2026-10-15T10:00:00Z", "80.00", 12, (short) 8, 1)));

        LoadSuggestionResponse response = service.suggest(USER_ID, request(8, 12), null);

        assertThat(response.rule()).isEqualTo("INCREASE_LOAD");
        assertThat(response.confidence()).isEqualTo("HIGH");
        assertThat(response.sessionsConsidered()).isEqualTo(3);
        assertThat(response.sets()).hasSize(1);
        assertThat(response.sets().get(0).weightKg()).isEqualByComparingTo("82.5");
        assertThat(response.sets().get(0).repetitions()).isEqualTo(8);
    }

    @Test
    @DisplayName("does not increase the load when the perceived effort is missing")
    void doesNotIncreaseTheLoadWithoutPerceivedEffort() {
        when(setRepository.findByUserIdAndExerciseId(USER_ID, EXERCISE_ID)).thenReturn(history(
                session("2026-10-01T10:00:00Z", "80.00", 12, null, 1),
                session("2026-10-08T10:00:00Z", "80.00", 12, null, 1),
                session("2026-10-15T10:00:00Z", "80.00", 12, null, 1)));

        LoadSuggestionResponse response = service.suggest(USER_ID, request(8, 12), null);

        assertThat(response.rule()).isEqualTo("KEEP_LAST_LOAD");
        assertThat(response.sets().get(0).weightKg()).isEqualByComparingTo("80.00");
        assertThat(response.warnings()).anyMatch(warning -> warning.contains("RPE"));
    }

    @Test
    @DisplayName("does not increase the load with fewer than three sessions")
    void doesNotIncreaseTheLoadWithFewerThanThreeSessions() {
        when(setRepository.findByUserIdAndExerciseId(USER_ID, EXERCISE_ID)).thenReturn(history(
                session("2026-10-08T10:00:00Z", "80.00", 12, (short) 8, 1),
                session("2026-10-15T10:00:00Z", "80.00", 12, (short) 8, 1)));

        LoadSuggestionResponse response = service.suggest(USER_ID, request(8, 12), null);

        assertThat(response.rule()).isEqualTo("KEEP_LAST_LOAD");
        assertThat(response.confidence()).isEqualTo("LOW");
        assertThat(response.sets().get(0).weightKg()).isEqualByComparingTo("80.00");
    }

    @Test
    @DisplayName("reduces the load when the last session reached a high perceived effort")
    void reducesTheLoadAfterAHighPerceivedEffort() {
        when(setRepository.findByUserIdAndExerciseId(USER_ID, EXERCISE_ID)).thenReturn(history(
                session("2026-10-08T10:00:00Z", "80.00", 10, (short) 8, 1),
                session("2026-10-15T10:00:00Z", "80.00", 10, (short) 9, 1)));

        LoadSuggestionResponse response = service.suggest(USER_ID, request(8, 12), null);

        assertThat(response.rule()).isEqualTo("REDUCE_LOAD");
        assertThat(response.sets().get(0).weightKg()).isEqualByComparingTo("77.5");
    }

    @Test
    @DisplayName("reduces the load when the last session stayed below the minimum repetitions")
    void reducesTheLoadBelowTheMinimumRepetitions() {
        when(setRepository.findByUserIdAndExerciseId(USER_ID, EXERCISE_ID)).thenReturn(history(
                session("2026-10-15T10:00:00Z", "80.00", 5, (short) 7, 1)));

        LoadSuggestionResponse response = service.suggest(USER_ID, request(8, 12), null);

        assertThat(response.rule()).isEqualTo("REDUCE_LOAD");
        assertThat(response.sets().get(0).weightKg()).isEqualByComparingTo("77.5");
        assertThat(response.sets().get(0).repetitions()).isEqualTo(8);
    }

    @Test
    @DisplayName("mirrors the last session when there is not enough evidence to progress")
    void mirrorsTheLastSessionWithoutEvidenceToProgress() {
        when(setRepository.findByUserIdAndExerciseId(USER_ID, EXERCISE_ID)).thenReturn(history(
                session("2026-10-08T10:00:00Z", "60.00", 10, (short) 8, 3),
                session("2026-10-15T10:00:00Z", "60.00", 10, (short) 8, 3)));

        LoadSuggestionResponse response = service.suggest(USER_ID, request(8, 12), null);

        assertThat(response.rule()).isEqualTo("KEEP_LAST_LOAD");
        assertThat(response.sets()).hasSize(3);
        assertThat(response.sets())
                .allSatisfy(set -> {
                    assertThat(set.weightKg()).isEqualByComparingTo("60.00");
                    assertThat(set.repetitions()).isEqualTo(10);
                });
    }

    @Test
    @DisplayName("keeps the repetitions of a bodyweight exercise and explains that no load is suggested")
    void keepsTheRepetitionsOfABodyweightExercise() {
        when(setRepository.findByUserIdAndExerciseId(USER_ID, EXERCISE_ID)).thenReturn(history(
                session("2026-10-15T10:00:00Z", null, 12, (short) 8, 2)));

        LoadSuggestionResponse response = service.suggest(USER_ID, request(8, 12), null);

        assertThat(response.rule()).isEqualTo("KEEP_LAST_LOAD");
        assertThat(response.sets()).hasSize(2);
        assertThat(response.sets()).allSatisfy(set -> {
            assertThat(set.weightKg()).isNull();
            assertThat(set.repetitions()).isEqualTo(12);
        });
        assertThat(response.explanation()).contains("não tem carga externa");
    }

    @Test
    @DisplayName("rejects an exercise blocked by an active restriction")
    void rejectsAnExerciseBlockedByAnActiveRestriction() {
        InjuryRestriction restriction = new InjuryRestriction(
                UUID.randomUUID(), USER, "Ombro", "Evitar movimentos acima da cabeça", true, List.of(EXERCISE_ID));
        when(restrictionRepository.findByUserId(USER_ID)).thenReturn(List.of(restriction));

        assertThatThrownBy(() -> service.suggest(USER_ID, request(8, 12), null))
                .isInstanceOf(FieldValidationException.class)
                .hasMessageContaining("restrição ativa");
    }

    @Test
    @DisplayName("reports an exercise of another user as not found")
    void reportsAnExerciseOfAnotherUserAsNotFound() {
        UUID foreignExerciseId = UUID.randomUUID();

        assertThatThrownBy(() -> service.suggest(
                USER_ID, new LoadSuggestionRequest(foreignExerciseId, 8, 12), null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("rejects an inverted target range")
    void rejectsAnInvertedTargetRange() {
        assertThatThrownBy(() -> service.suggest(USER_ID, request(12, 8), null))
                .isInstanceOf(FieldValidationException.class);
    }

    private static LoadSuggestionRequest request(Integer min, Integer max) {
        return new LoadSuggestionRequest(EXERCISE_ID, min, max);
    }

    private static List<ExerciseSet> history(List<ExerciseSet>... sessions) {
        List<ExerciseSet> all = new ArrayList<>();
        for (List<ExerciseSet> session : sessions) {
            all.addAll(session);
        }
        return all;
    }

    private static List<ExerciseSet> session(String completedAt, String weight, int repetitions, Short rpe,
            int setCount) {
        Instant instant = Instant.parse(completedAt);
        WorkoutSession session = new WorkoutSession(
                UUID.randomUUID(), USER, null, null, instant, SessionStatus.COMPLETED);
        session.complete(instant);
        SessionExercise sessionExercise = new SessionExercise(
                UUID.randomUUID(), session, EXERCISE, 1);
        BigDecimal load = weight == null ? null : new BigDecimal(weight);
        List<ExerciseSet> sets = new ArrayList<>();
        for (int setNumber = 1; setNumber <= setCount; setNumber++) {
            sets.add(new ExerciseSet(UUID.randomUUID(), sessionExercise, setNumber, load, repetitions,
                    null, null, rpe, null, null));
        }
        return sets;
    }

    private static AiProperties properties() {
        return new AiProperties(
                new AiProperties.Limits(7, 10, 8, 30, 600, 80, 8, 12, 90),
                new AiProperties.RateLimit(10, 60));
    }
}
