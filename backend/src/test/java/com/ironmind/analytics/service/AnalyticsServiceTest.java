package com.ironmind.analytics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.ironmind.analytics.dto.DashboardOverviewResponse;
import com.ironmind.analytics.dto.ExerciseProgressResponse;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.program.repository.WorkoutProgramRepository;
import com.ironmind.record.repository.PersonalRecordRepository;
import com.ironmind.workout.entity.ExerciseSet;
import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import com.ironmind.workout.repository.ExerciseSetRepository;
import com.ironmind.workout.repository.WorkoutSessionRepository;
import com.ironmind.workout.service.OneRepMaxCalculator;
import com.ironmind.workout.service.VolumeCalculator;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID EXERCISE_ID = UUID.randomUUID();
    private static final UUID SESSION_ID = UUID.randomUUID();
    private static final UUID SESSION_EXERCISE_ID = UUID.randomUUID();

    @Mock
    private WorkoutSessionRepository sessionRepository;
    @Mock
    private ExerciseSetRepository exerciseSetRepository;
    @Mock
    private PersonalRecordRepository recordRepository;
    @Mock
    private ExerciseRepository exerciseRepository;
    @Mock
    private WorkoutProgramRepository programRepository;

    private AnalyticsService analyticsService() {
        return new AnalyticsService(sessionRepository, exerciseSetRepository, recordRepository,
                exerciseRepository, programRepository, new VolumeCalculator(),
                new OneRepMaxCalculator(), Clock.fixed(Instant.parse("2026-10-21T12:00:00Z"),
                        ZoneId.of("UTC")));
    }

    @Test
    @DisplayName("builds the dashboard overview with volume, activity and comparison with the previous week")
    void buildsTheDashboardOverviewWithVolumeActivityAndComparison() {
        AnalyticsService analyticsService = analyticsService();
        WorkoutSession current = new WorkoutSession(SESSION_ID, USER_ID, null, null,
                Instant.parse("2026-10-19T10:00:00Z"), SessionStatus.COMPLETED);
        current.complete(Instant.parse("2026-10-19T11:00:00Z"));
        Exercise exercise = new Exercise(EXERCISE_ID, "Supino", null, "PEITO", List.of(), "Barra", null,
                MovementType.COMPOUND);
        ExerciseSet set = new ExerciseSet(UUID.randomUUID(), USER_ID, SESSION_ID, SESSION_EXERCISE_ID,
                exercise.getId(), 1, new BigDecimal("80.00"), 10, null, null, null, null, null);

        when(sessionRepository.findCompletedBetween(
                eq(USER_ID), eq(SessionStatus.COMPLETED), any(), any(), any()))
                .thenReturn(List.of(current));
        when(exerciseSetRepository.findBySessionIdIn(List.of(SESSION_ID))).thenReturn(List.of(set));
        when(recordRepository.countAchievedBetween(
                eq(USER_ID), any(), any())).thenReturn(2L);
        when(sessionRepository.findFirstByUserIdAndStatusAndCompletedAtIsNotNullOrderByCompletedAtDesc(
                USER_ID, SessionStatus.COMPLETED)).thenReturn(Optional.of(current));

        DashboardOverviewResponse response = analyticsService.overview(USER_ID);

        assertThat(response.summary().totalVolumeKg()).isEqualByComparingTo("800.00");
        assertThat(response.summary().completedSessions()).isEqualTo(1);
        assertThat(response.summary().recordsBroken()).isEqualTo(2);
        assertThat(response.summary().totalSets()).isEqualTo(1);
        assertThat(response.volumeChangePercent()).isEqualByComparingTo("0.0");
        assertThat(response.activity()).isNotEmpty();
        assertThat(response.recentSessions()).hasSize(1);
    }

    @Test
    @DisplayName("builds exercise progress with best weight and best estimated 1RM per day")
    void buildsExerciseProgressWithBestWeightAndBestEstimated1RmPerDay() {
        AnalyticsService analyticsService = analyticsService();
        Exercise exercise = new Exercise(EXERCISE_ID, "Supino", null, "PEITO", List.of(), "Barra", null,
                MovementType.COMPOUND);
        ExerciseSet set = new ExerciseSet(UUID.randomUUID(), USER_ID, SESSION_ID, SESSION_EXERCISE_ID,
                EXERCISE_ID, 1, new BigDecimal("100.00"), 5, null, null, null, null, null);

        when(exerciseRepository.findById(EXERCISE_ID)).thenReturn(Optional.of(exercise));
        when(exerciseSetRepository.findByUserIdAndExerciseIdOrderByCompletedAtAscIdAsc(USER_ID, EXERCISE_ID))
                .thenReturn(List.of(set));

        ExerciseProgressResponse response = analyticsService.exerciseProgress(USER_ID, EXERCISE_ID);

        assertThat(response.exercise().id()).isEqualTo(EXERCISE_ID);
        assertThat(response.points()).hasSize(1);
        assertThat(response.points().getFirst().bestWeightKg()).isEqualByComparingTo("100.00");
        assertThat(response.points().getFirst().sets()).isEqualTo(1);
    }
}
