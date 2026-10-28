package com.ironmind.workout.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.DecimalNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.ironmind.common.exception.ConflictException;
import com.ironmind.common.exception.IdempotencyKeyReusedException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.record.service.PersonalRecordService;
import com.ironmind.workout.dto.RegisterSetRequest;
import com.ironmind.workout.dto.UpdateSetRequest;
import com.ironmind.workout.entity.ExerciseSet;
import com.ironmind.workout.entity.SessionExercise;
import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import com.ironmind.workout.repository.ExerciseSetRepository;
import com.ironmind.workout.repository.SessionExerciseRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ExerciseSetServiceTest {

    private static final UUID OWNER_ID = UUID.randomUUID();
    private static final UUID OTHER_USER_ID = UUID.randomUUID();
    private static final UUID SESSION_ID = UUID.randomUUID();
    private static final UUID SESSION_EXERCISE_ID = UUID.randomUUID();
    private static final UUID EXERCISE_ID = UUID.randomUUID();
    private static final String IDEMPOTENCY_KEY = "3f8c1d2e-9b7a-4c1e-8f2b-0a1c3d5e7f90";

    @Mock
    private ExerciseSetRepository exerciseSetRepository;

    @Mock
    private SessionExerciseRepository sessionExerciseRepository;

    @Mock
    private WorkoutSessionService workoutSessionService;

    @Mock
    private PersonalRecordService personalRecordService;

    @InjectMocks
    private ExerciseSetService exerciseSetService;

    @Test
    @DisplayName("assigns the number of the set on the server and never reads it from the body")
    void assignsTheNumberOfTheSetOnTheServerAndNeverReadsItFromTheBody() {
        when(workoutSessionService.requireOwnedSession(SESSION_ID, OWNER_ID))
                .thenReturn(session(SessionStatus.IN_PROGRESS));
        when(sessionExerciseRepository.findByIdAndSessionId(SESSION_EXERCISE_ID, SESSION_ID))
                .thenReturn(Optional.of(sessionExercise()));
        when(exerciseSetRepository.findFirstBySessionExerciseIdOrderBySetNumberDesc(SESSION_EXERCISE_ID))
                .thenReturn(Optional.of(registeredSet()));
        when(exerciseSetRepository.save(any(ExerciseSet.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RegisterSetRequest request = new RegisterSetRequest(SESSION_EXERCISE_ID, new BigDecimal("80.00"), 10,
                null, null, null, 90);

        ExerciseSetService.RegistrationResult result = exerciseSetService.register(SESSION_ID, request, OWNER_ID, null);

        ArgumentCaptor<ExerciseSet> captor = ArgumentCaptor.forClass(ExerciseSet.class);
        verify(exerciseSetRepository).save(captor.capture());
        assertThat(captor.getValue().getSetNumber()).isEqualTo(2);
        assertThat(result.created()).isTrue();
        assertThat(result.set().setNumber()).isEqualTo(2);
        verify(personalRecordService).recalculate(OWNER_ID, EXERCISE_ID);
    }

    @Test
    @DisplayName("returns the same series when the key is replayed with the same body")
    void returnsTheSameSeriesWhenTheKeyIsReplayedWithTheSameBody() {
        ExerciseSet registered = registeredSet();
        when(workoutSessionService.requireOwnedSession(SESSION_ID, OWNER_ID))
                .thenReturn(session(SessionStatus.IN_PROGRESS));
        when(sessionExerciseRepository.findByIdAndSessionId(SESSION_EXERCISE_ID, SESSION_ID))
                .thenReturn(Optional.of(sessionExercise()));
        when(exerciseSetRepository.findByIdempotencyKey(anyString()))
                .thenReturn(Optional.of(registered));

        RegisterSetRequest request = new RegisterSetRequest(SESSION_EXERCISE_ID, new BigDecimal("80.00"), 10,
                null, null, null, 90);

        ExerciseSetService.RegistrationResult result = exerciseSetService.register(SESSION_ID, request, OWNER_ID,
                IDEMPOTENCY_KEY);

        assertThat(result.created()).isFalse();
        assertThat(result.set().id()).isEqualTo(registered.getId());
        verify(exerciseSetRepository, never()).save(any(ExerciseSet.class));
    }

    @Test
    @DisplayName("refuses the reuse of a key with a different body")
    void refusesTheReuseOfAKeyWithADifferentBody() {
        when(workoutSessionService.requireOwnedSession(SESSION_ID, OWNER_ID))
                .thenReturn(session(SessionStatus.IN_PROGRESS));
        when(sessionExerciseRepository.findByIdAndSessionId(SESSION_EXERCISE_ID, SESSION_ID))
                .thenReturn(Optional.of(sessionExercise()));
        when(exerciseSetRepository.findByIdempotencyKey(anyString()))
                .thenReturn(Optional.of(registeredSet()));

        RegisterSetRequest request = new RegisterSetRequest(SESSION_EXERCISE_ID, new BigDecimal("100.00"), 10,
                null, null, null, 90);

        assertThatThrownBy(() -> exerciseSetService.register(SESSION_ID, request, OWNER_ID, IDEMPOTENCY_KEY))
                .isInstanceOf(IdempotencyKeyReusedException.class);
    }

    @Test
    @DisplayName("refuses a series in a session that is already finished")
    void refusesASeriesInASessionThatIsAlreadyFinished() {
        when(workoutSessionService.requireOwnedSession(SESSION_ID, OWNER_ID))
                .thenReturn(session(SessionStatus.COMPLETED));

        RegisterSetRequest request = new RegisterSetRequest(SESSION_EXERCISE_ID, new BigDecimal("80.00"), 10,
                null, null, null, 90);

        assertThatThrownBy(() -> exerciseSetService.register(SESSION_ID, request, OWNER_ID, null))
                .isInstanceOf(ConflictException.class);
        verify(exerciseSetRepository, never()).save(any(ExerciseSet.class));
    }

    @Test
    @DisplayName("reports a session exercise of another session as not found")
    void reportsASessionExerciseOfAnotherSessionAsNotFound() {
        when(workoutSessionService.requireOwnedSession(SESSION_ID, OWNER_ID))
                .thenReturn(session(SessionStatus.IN_PROGRESS));
        when(sessionExerciseRepository.findByIdAndSessionId(eq(SESSION_EXERCISE_ID), eq(SESSION_ID)))
                .thenReturn(Optional.empty());

        RegisterSetRequest request = new RegisterSetRequest(SESSION_EXERCISE_ID, new BigDecimal("80.00"), 10,
                null, null, null, 90);

        assertThatThrownBy(() -> exerciseSetService.register(SESSION_ID, request, OWNER_ID, null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("corrects a series keeping its identifier and its number")
    void correctsASeriesKeepingItsIdentifierAndItsNumber() {
        ExerciseSet set = registeredSet();
        when(exerciseSetRepository.findByIdAndUserId(set.getId(), OWNER_ID)).thenReturn(Optional.of(set));
        when(workoutSessionService.requireOwnedSession(SESSION_ID, OWNER_ID))
                .thenReturn(session(SessionStatus.IN_PROGRESS));
        when(exerciseSetRepository.save(any(ExerciseSet.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = exerciseSetService.update(set.getId(),
                new UpdateSetRequest(weight(82.50), 8, null, null, null, null), OWNER_ID);

        assertThat(response.id()).isEqualTo(set.getId());
        assertThat(response.setNumber()).isEqualTo(set.getSetNumber());
        assertThat(response.weightKg()).isEqualByComparingTo("82.50");
        assertThat(response.repetitions()).isEqualTo(8);
        verify(personalRecordService).recalculate(OWNER_ID, EXERCISE_ID);
    }

    @Test
    @DisplayName("clears the load of a series when the correction sends null")
    void clearsTheLoadOfASeriesWhenTheCorrectionSendsNull() {
        ExerciseSet set = registeredSet();
        when(exerciseSetRepository.findByIdAndUserId(set.getId(), OWNER_ID)).thenReturn(Optional.of(set));
        when(workoutSessionService.requireOwnedSession(SESSION_ID, OWNER_ID))
                .thenReturn(session(SessionStatus.IN_PROGRESS));
        when(exerciseSetRepository.save(any(ExerciseSet.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = exerciseSetService.update(set.getId(),
                new UpdateSetRequest(NullNode.getInstance(), null, null, null, null, null), OWNER_ID);

        assertThat(response.weightKg()).isNull();
        assertThat(response.repetitions()).isEqualTo(10);
        verify(personalRecordService).recalculate(OWNER_ID, EXERCISE_ID);
    }

    @Test
    @DisplayName("reports a series of another user as not found")
    void reportsASeriesOfAnotherUserAsNotFound() {
        when(exerciseSetRepository.findByIdAndUserId(any(UUID.class), eq(OWNER_ID))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> exerciseSetService.update(UUID.randomUUID(),
                new UpdateSetRequest(weight(82.50), 8, null, null, null, null), OWNER_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    /**
     * Builds the JSON node of a load, as the client sends it.
     */
    private static JsonNode weight(double value) {
        return DecimalNode.valueOf(BigDecimal.valueOf(value));
    }

    private static WorkoutSession session(SessionStatus status) {
        return new WorkoutSession(SESSION_ID, OWNER_ID, null, null, Instant.now(), status);
    }

    private static SessionExercise sessionExercise() {
        return new SessionExercise(SESSION_EXERCISE_ID, SESSION_ID, EXERCISE_ID, 1);
    }

    private static ExerciseSet registeredSet() {
        return new ExerciseSet(UUID.randomUUID(), OWNER_ID, SESSION_ID, SESSION_EXERCISE_ID, EXERCISE_ID, 1,
                new BigDecimal("80.00"), 10, null, null, null, 90, null);
    }
}
