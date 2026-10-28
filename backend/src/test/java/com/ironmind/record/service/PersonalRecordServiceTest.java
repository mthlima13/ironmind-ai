package com.ironmind.record.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ironmind.record.entity.PersonalRecord;
import com.ironmind.record.entity.RecordType;
import com.ironmind.record.repository.PersonalRecordRepository;
import com.ironmind.workout.entity.ExerciseSet;
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
    private OneRepMaxCalculator oneRepMaxCalculator;

    @InjectMocks
    private PersonalRecordService personalRecordService;

    @Test
    @DisplayName("creates records from sets using Brzycki and the documented rules")
    void createsRecordsFromSetsUsingBrzyckiAndTheDocumentedRules() {
        ExerciseSet set = set(1, new BigDecimal("100.00"), 5);

        when(exerciseSetRepository.findByUserIdAndExerciseIdOrderByCompletedAtAscIdAsc(USER_ID, EXERCISE_ID))
                .thenReturn(List.of(set));
        when(recordRepository.findByUserIdAndExerciseIdAndRecordType(eq(USER_ID), eq(EXERCISE_ID),
                any(RecordType.class))).thenReturn(Optional.empty());
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
        ExerciseSet highReps = set(1, new BigDecimal("80.00"), 12);
        ExerciseSet bodyweight = set(2, null, 8);

        when(exerciseSetRepository.findByUserIdAndExerciseIdOrderByCompletedAtAscIdAsc(USER_ID, EXERCISE_ID))
                .thenReturn(List.of(highReps, bodyweight));
        when(recordRepository.findByUserIdAndExerciseIdAndRecordType(eq(USER_ID), eq(EXERCISE_ID),
                any(RecordType.class))).thenReturn(Optional.empty());
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
        PersonalRecord existing = new PersonalRecord(UUID.randomUUID(), USER_ID, EXERCISE_ID,
                RecordType.MAX_REPS_AT_WEIGHT, new BigDecimal("10"), "reps", null,
                Instant.parse("2026-10-19T10:00:00Z"));

        when(exerciseSetRepository.findByUserIdAndExerciseIdOrderByCompletedAtAscIdAsc(USER_ID, EXERCISE_ID))
                .thenReturn(List.of());
        when(recordRepository.findByUserIdAndExerciseIdAndRecordType(USER_ID, EXERCISE_ID,
                RecordType.MAX_WEIGHT)).thenReturn(Optional.empty());
        when(recordRepository.findByUserIdAndExerciseIdAndRecordType(USER_ID, EXERCISE_ID,
                RecordType.MAX_REPS_AT_WEIGHT)).thenReturn(Optional.of(existing));
        when(recordRepository.findByUserIdAndExerciseIdAndRecordType(USER_ID, EXERCISE_ID,
                RecordType.BEST_ESTIMATED_1RM)).thenReturn(Optional.empty());

        personalRecordService.recalculate(USER_ID, EXERCISE_ID);

        verify(recordRepository).delete(existing);
    }

    @Test
    @DisplayName("updates an existing record of the same type instead of creating a second one")
    void updatesTheExistingRecordOfTheSameType() {
        ExerciseSet set = set(1, new BigDecimal("105.00"), 5);
        PersonalRecord existing = new PersonalRecord(UUID.randomUUID(), USER_ID, EXERCISE_ID,
                RecordType.MAX_WEIGHT, new BigDecimal("100.00"), "kg", null,
                Instant.parse("2026-10-19T10:00:00Z"));

        when(exerciseSetRepository.findByUserIdAndExerciseIdOrderByCompletedAtAscIdAsc(USER_ID, EXERCISE_ID))
                .thenReturn(List.of(set));
        when(recordRepository.findByUserIdAndExerciseIdAndRecordType(eq(USER_ID), eq(EXERCISE_ID),
                any(RecordType.class)))
                .thenAnswer(invocation -> invocation.getArgument(2) == RecordType.MAX_WEIGHT
                        ? Optional.of(existing)
                        : Optional.empty());
        when(oneRepMaxCalculator.estimate(set.getWeightKg(), set.getRepetitions()))
                .thenReturn(Optional.empty());

        personalRecordService.recalculate(USER_ID, EXERCISE_ID);

        // The entity is not dirty checked: the update only reaches the database through save.
        verify(recordRepository).save(existing);
        assertThat(existing.getValue()).isEqualByComparingTo("105.00");
        assertThat(existing.getSourceSetId()).isEqualTo(set.getId());
    }

    private static ExerciseSet set(int setNumber, BigDecimal weight, int repetitions) {
        return new ExerciseSet(UUID.randomUUID(), USER_ID, SESSION_ID, SESSION_EXERCISE_ID, EXERCISE_ID,
                setNumber, weight, repetitions, null, null, null, null, null);
    }
}
