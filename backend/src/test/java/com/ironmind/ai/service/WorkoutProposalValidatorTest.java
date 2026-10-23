package com.ironmind.ai.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ironmind.ai.config.AiProperties;
import com.ironmind.ai.provider.AiContext;
import com.ironmind.ai.schema.WorkoutProposalPayload;
import com.ironmind.common.exception.AiInvalidResponseException;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.user.entity.TrainingExperience;
import com.ironmind.user.entity.TrainingGoal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class WorkoutProposalValidatorTest {

    private static final UUID BENCH_PRESS = UUID.randomUUID();
    private static final UUID SQUAT = UUID.randomUUID();

    private final WorkoutProposalValidator validator = new WorkoutProposalValidator(properties());

    @Test
    @DisplayName("keeps the valid exercises of the catalog")
    void keepsTheValidExercisesOfTheCatalog() {
        WorkoutProposalPayload payload = new WorkoutProposalPayload(
                "Treino de hipertrofia",
                TrainingGoal.HYPERTROPHY,
                List.of(new WorkoutProposalPayload.Day("Peito", List.of(
                        planned(BENCH_PRESS, 3, 8, 12, 90),
                        planned(SQUAT, 4, 6, 10, 120)))),
                "Explicação");

        ValidatedWorkoutProposal validated = validator.validate(payload, context(BENCH_PRESS, SQUAT));

        assertThat(validated.name()).isEqualTo("Treino de hipertrofia");
        assertThat(validated.goal()).isEqualTo(TrainingGoal.HYPERTROPHY);
        assertThat(validated.days()).hasSize(1);
        assertThat(validated.days().get(0).exercises())
                .extracting(ValidatedWorkoutProposal.Exercise::exerciseId)
                .containsExactly(BENCH_PRESS, SQUAT);
        assertThat(validated.warnings()).isEmpty();
    }

    @Test
    @DisplayName("discards an exercise that is not in the visible catalog, such as an exercise blocked by a restriction")
    void discardsAnExerciseOutsideOfTheVisibleCatalog() {
        UUID blockedByRestriction = UUID.randomUUID();
        WorkoutProposalPayload payload = new WorkoutProposalPayload(
                null,
                null,
                List.of(new WorkoutProposalPayload.Day("Peito", List.of(
                        planned(BENCH_PRESS, 3, 8, 12, 90),
                        planned(blockedByRestriction, 3, 8, 12, 90)))),
                null);

        ValidatedWorkoutProposal validated = validator.validate(payload, context(BENCH_PRESS));

        assertThat(validated.days().get(0).exercises()).hasSize(1);
        assertThat(validated.days().get(0).exercises().get(0).exerciseId()).isEqualTo(BENCH_PRESS);
        assertThat(validated.warnings())
                .anyMatch(warning -> warning.contains("descartados"));
        assertThat(validated.goal()).isEqualTo(TrainingGoal.STRENGTH);
    }

    @Test
    @DisplayName("discards a repeated exercise inside the same day")
    void discardsARepeatedExerciseInsideTheSameDay() {
        WorkoutProposalPayload payload = new WorkoutProposalPayload(
                "Treino",
                TrainingGoal.GENERAL,
                List.of(new WorkoutProposalPayload.Day("Dia 1", List.of(
                        planned(BENCH_PRESS, 3, 8, 12, 90),
                        planned(BENCH_PRESS, 2, 10, 12, 60)))),
                null);

        ValidatedWorkoutProposal validated = validator.validate(payload, context(BENCH_PRESS));

        assertThat(validated.days().get(0).exercises()).hasSize(1);
        assertThat(validated.warnings()).anyMatch(warning -> warning.contains("descartados"));
    }

    @Test
    @DisplayName("clamps the values outside of the application limits")
    void clampsTheValuesOutsideOfTheApplicationLimits() {
        WorkoutProposalPayload payload = new WorkoutProposalPayload(
                "Treino",
                TrainingGoal.GENERAL,
                List.of(new WorkoutProposalPayload.Day("Dia 1", List.of(
                        new WorkoutProposalPayload.PlannedExercise(
                                BENCH_PRESS,
                                99,
                                new WorkoutProposalPayload.RepRange(0, 500),
                                9_999)))),
                null);

        ValidatedWorkoutProposal.Exercise exercise =
                validator.validate(payload, context(BENCH_PRESS)).days().get(0).exercises().get(0);

        assertThat(exercise.sets()).isEqualTo(8);
        assertThat(exercise.repsMin()).isEqualTo(1);
        assertThat(exercise.repsMax()).isEqualTo(30);
        assertThat(exercise.restSeconds()).isEqualTo(600);
    }

    @Test
    @DisplayName("uses the default range when the model omits the repetitions or the rest")
    void usesTheDefaultRangeWhenTheModelOmitsIt() {
        WorkoutProposalPayload payload = new WorkoutProposalPayload(
                "Treino",
                TrainingGoal.GENERAL,
                List.of(new WorkoutProposalPayload.Day("Dia 1", List.of(
                        new WorkoutProposalPayload.PlannedExercise(BENCH_PRESS, null, null, null)))),
                null);

        ValidatedWorkoutProposal.Exercise exercise =
                validator.validate(payload, context(BENCH_PRESS)).days().get(0).exercises().get(0);

        assertThat(exercise.sets()).isEqualTo(3);
        assertThat(exercise.repsMin()).isEqualTo(8);
        assertThat(exercise.repsMax()).isEqualTo(12);
        assertThat(exercise.restSeconds()).isEqualTo(90);
    }

    @Test
    @DisplayName("swaps an inverted repetition range")
    void swapsAnInvertedRepetitionRange() {
        WorkoutProposalPayload payload = new WorkoutProposalPayload(
                "Treino",
                TrainingGoal.GENERAL,
                List.of(new WorkoutProposalPayload.Day("Dia 1", List.of(
                        planned(BENCH_PRESS, 3, 12, 8, 90)))),
                null);

        ValidatedWorkoutProposal.Exercise exercise =
                validator.validate(payload, context(BENCH_PRESS)).days().get(0).exercises().get(0);

        assertThat(exercise.repsMin()).isEqualTo(8);
        assertThat(exercise.repsMax()).isEqualTo(12);
    }

    @Test
    @DisplayName("caps the number of days")
    void capsTheNumberOfDays() {
        List<WorkoutProposalPayload.Day> days = new ArrayList<>();
        for (int day = 0; day < 10; day++) {
            days.add(new WorkoutProposalPayload.Day("Dia " + (day + 1),
                    List.of(planned(BENCH_PRESS, 3, 8, 12, 90))));
        }

        ValidatedWorkoutProposal validated = validator.validate(
                new WorkoutProposalPayload("Treino", TrainingGoal.GENERAL, days, null),
                context(BENCH_PRESS));

        assertThat(validated.days()).hasSize(7);
        assertThat(validated.warnings()).anyMatch(warning -> warning.contains("mais de 7 dias"));
    }

    @Test
    @DisplayName("caps the number of exercises of a day")
    void capsTheNumberOfExercisesOfADay() {
        List<UUID> catalogIds = new ArrayList<>();
        List<WorkoutProposalPayload.PlannedExercise> exercises = new ArrayList<>();
        for (int index = 0; index < 12; index++) {
            UUID exerciseId = UUID.randomUUID();
            catalogIds.add(exerciseId);
            exercises.add(planned(exerciseId, 3, 8, 12, 90));
        }

        ValidatedWorkoutProposal validated = validator.validate(
                new WorkoutProposalPayload("Treino", TrainingGoal.GENERAL,
                        List.of(new WorkoutProposalPayload.Day("Dia 1", exercises)), null),
                context(catalogIds.toArray(UUID[]::new)));

        assertThat(validated.days()).hasSize(1);
        assertThat(validated.days().get(0).exercises()).hasSize(10);
        assertThat(validated.warnings()).anyMatch(warning -> warning.contains("mais de 10 exercícios"));
    }

    @Test
    @DisplayName("rejects a proposal without any valid exercise")
    void rejectsAProposalWithoutAnyValidExercise() {
        WorkoutProposalPayload payload = new WorkoutProposalPayload(
                "Treino",
                TrainingGoal.GENERAL,
                List.of(new WorkoutProposalPayload.Day("Dia 1", List.of(
                        planned(UUID.randomUUID(), 3, 8, 12, 90)))),
                null);

        assertThatThrownBy(() -> validator.validate(payload, context(BENCH_PRESS)))
                .isInstanceOf(AiInvalidResponseException.class);
    }

    private static WorkoutProposalPayload.PlannedExercise planned(UUID exerciseId, int sets, int min, int max,
            int restSeconds) {
        return new WorkoutProposalPayload.PlannedExercise(
                exerciseId, sets, new WorkoutProposalPayload.RepRange(min, max), restSeconds);
    }

    private static AiContext context(UUID... exerciseIds) {
        List<AiContext.CatalogExercise> catalog = new ArrayList<>();
        for (UUID exerciseId : exerciseIds) {
            catalog.add(new AiContext.CatalogExercise(
                    exerciseId, "Exercício " + exerciseId, "PEITO", "Barra", MovementType.COMPOUND));
        }
        return new AiContext(TrainingGoal.STRENGTH, TrainingExperience.INTERMEDIATE, 3,
                List.of("Barra"), List.of(), catalog);
    }

    private static AiProperties properties() {
        return new AiProperties(
                new AiProperties.Limits(7, 10, 8, 30, 600, 80, 8, 12, 90),
                new AiProperties.RateLimit(10, 60));
    }
}
