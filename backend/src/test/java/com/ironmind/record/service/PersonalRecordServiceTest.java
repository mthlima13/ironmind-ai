package com.ironmind.record.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.record.entity.PersonalRecord;
import com.ironmind.record.entity.RecordType;
import com.ironmind.record.repository.PersonalRecordRepository;
import com.ironmind.user.entity.User;
import com.ironmind.user.entity.UserRole;
import com.ironmind.user.repository.UserRepository;
import com.ironmind.workout.entity.ExerciseSet;
import com.ironmind.workout.entity.SessionExercise;
import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import com.ironmind.workout.repository.ExerciseSetRepository;
import com.ironmind.workout.service.OneRepMaxCalculator;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
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
class PersonalRecordServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EXERCISE_ID = UUID.randomUUID();
    private static final UUID SESSION_ID = UUID.randomUUID();
    private static final UUID SESSION_EXERCISE_ID = UUID.randomUUID();

    @Mock
    private PersonalRecordRepository recordRepository;
    @Mock
    private ExerciseSetRepository exerciseSetRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private OneRepMaxCalculator oneRepMaxCalculator;

    @InjectMocks
    private PersonalRecordService personalRecordService;

    @Test
    @DisplayName("creates records from sets using Brzycki and the documented rules")
    void createsRecordsFromSetsUsingBrzyckiAndTheDocumentedRules() {
        User user = new User(USER_ID, "Ana", "ana@example.com", "hash", UserRole.USER, "America/Sao_Paulo");
        Exercise exercise = new Exercise(EXERCISE_ID, "Agachamento", null, "PERNAS", List.of(), "Barra",
                null, MovementType.COMPOUND);
        WorkoutSession session = new WorkoutSession(SESSION_ID, user, null, null, Instant.parse("2026-10-19T10:00:00Z"),
                SessionStatus.COMPLETED);
        SessionExercise sessionExercise = new SessionExercise(SESSION_EXERCISE_ID, session, exercise, 1);
        ExerciseSet set = new ExerciseSet(UUID.randomUUID(), sessionExercise, 1, new BigDecimal("100.00"), 5,
                null, null, null, null, null);

        when(exerciseSetRepository.findByUserIdAndExerciseId(USER_ID, EXERCISE_ID)).thenReturn(List.of(set));
        when(recordRepository.findByUserIdAndExerciseIdAndRecordType(eq(USER_ID), eq(EXERCISE_ID),
                any(RecordType.class))).thenReturn(Optional.empty());
        when(userRepository.getReferenceById(USER_ID)).thenReturn(user);
        when(exerciseRepository.getReferenceById(EXERCISE_ID)).thenReturn(exercise);
        when(oneRepMaxCalculator.estimate(set.getWeightKg(), set.getRepetitions()))
                .thenReturn(Optional.of(new BigDecimal("117.65")));

        personalRecordService.recalculate(USER_ID, EXERCISE_ID);

        ArgumentCaptor<PersonalRecord> captor = ArgumentCaptor.forClass(PersonalRecord.class);
        verify(recordRepository, org.mockito.Mockito.times(3)).save(captor.capture());
        List<PersonalRecord> saved = captor.getAllValues();
        assertThat(saved.stream().anyMatch(r -> r.getRecordType() == RecordType.MAX_WEIGHT
                && r.getValue().compareTo(new BigDecimal("100.00")) == 0
                && "kg".equals(r.getUnit()))).isTrue();
        assertThat(saved.stream().anyMatch(r -> r.getRecordType() == RecordType.MAX_REPS_AT_WEIGHT
                && r.getValue().compareTo(new BigDecimal("5")) == 0
                && "reps".equals(r.getUnit()))).isTrue();
        assertThat(saved.stream().anyMatch(r -> r.getRecordType() == RecordType.BEST_ESTIMATED_1RM)).isTrue();
    }

    @Test
    @DisplayName("does not estimate 1RM outside 1 to 10 repetitions and does not create load records for bodyweight sets")
    void doesNotEstimateOutsideRangeAndIgnoresBodyweightLoadRecords() {
        User user = new User(USER_ID, "Ana", "ana@example.com", "hash", UserRole.USER, "America/Sao_Paulo");
        Exercise exercise = new Exercise(EXERCISE_ID, "Barra Fixa", null, "COSTAS", List.of(), "Corporal",
                null, MovementType.COMPOUND);
        WorkoutSession session = new WorkoutSession(SESSION_ID, user, null, null, Instant.parse("2026-10-19T10:00:00Z"),
                SessionStatus.COMPLETED);
        SessionExercise sessionExercise = new SessionExercise(SESSION_EXERCISE_ID, session, exercise, 1);
        ExerciseSet highReps = new ExerciseSet(UUID.randomUUID(), sessionExercise, 1, new BigDecimal("80.00"), 12,
                null, null, null, null, null);
        ExerciseSet bodyweight = new ExerciseSet(UUID.randomUUID(), sessionExercise, 2, null, 8, null, null, null,
                null, null);

        when(exerciseSetRepository.findByUserIdAndExerciseId(USER_ID, EXERCISE_ID))
                .thenReturn(List.of(highReps, bodyweight));
        when(recordRepository.findByUserIdAndExerciseIdAndRecordType(eq(USER_ID), eq(EXERCISE_ID),
                any(RecordType.class))).thenReturn(Optional.empty());
        when(userRepository.getReferenceById(USER_ID)).thenReturn(user);
        when(exerciseRepository.getReferenceById(EXERCISE_ID)).thenReturn(exercise);
        when(oneRepMaxCalculator.estimate(any(), any(int.class)))
                .thenReturn(Optional.empty());

        personalRecordService.recalculate(USER_ID, EXERCISE_ID);

        ArgumentCaptor<PersonalRecord> captor = ArgumentCaptor.forClass(PersonalRecord.class);
        verify(recordRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        List<PersonalRecord> saved = captor.getAllValues();
        assertThat(saved).hasSize(2);
        boolean hasMaxWeight = saved.stream().anyMatch(r -> r.getRecordType() == RecordType.MAX_WEIGHT);
        boolean hasMaxReps = saved.stream().anyMatch(r -> r.getRecordType() == RecordType.MAX_REPS_AT_WEIGHT);
        assertThat(hasMaxWeight && hasMaxReps).isTrue();
    }

    @Test
    @DisplayName("removes records when no valid sets remain")
    void removesRecordsWhenNoValidSetsRemain() {
        User user = new User(USER_ID, "Ana", "ana@example.com", "hash", UserRole.USER, "America/Sao_Paulo");
        Exercise exercise = new Exercise(EXERCISE_ID, "Barra Fixa", null, "COSTAS", List.of(), "Corporal",
                null, MovementType.COMPOUND);
        PersonalRecord existing = new PersonalRecord(UUID.randomUUID(), user, exercise,
                RecordType.MAX_REPS_AT_WEIGHT, new BigDecimal("10"), "reps", null,
                Instant.parse("2026-10-19T10:00:00Z"));

        when(exerciseSetRepository.findByUserIdAndExerciseId(USER_ID, EXERCISE_ID)).thenReturn(List.of());
        when(recordRepository.findByUserIdAndExerciseIdAndRecordType(USER_ID, EXERCISE_ID,
                RecordType.MAX_WEIGHT)).thenReturn(Optional.empty());
        when(recordRepository.findByUserIdAndExerciseIdAndRecordType(USER_ID, EXERCISE_ID,
                RecordType.MAX_REPS_AT_WEIGHT)).thenReturn(Optional.of(existing));
        when(recordRepository.findByUserIdAndExerciseIdAndRecordType(USER_ID, EXERCISE_ID,
                RecordType.BEST_ESTIMATED_1RM)).thenReturn(Optional.empty());

        personalRecordService.recalculate(USER_ID, EXERCISE_ID);

        verify(recordRepository).delete(existing);
    }
}
