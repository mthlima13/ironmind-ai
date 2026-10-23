package com.ironmind.ai.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ironmind.ai.schema.VoiceInterpretationPayload;
import com.ironmind.ai.schema.WorkoutProposalPayload;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.user.entity.TrainingExperience;
import com.ironmind.user.entity.TrainingGoal;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class MockLlmProviderTest {

    private final MockLlmProvider provider = new MockLlmProvider();

    @Test
    @DisplayName("proposes the exercises of the catalog without repeating an identifier")
    void proposesTheExercisesOfTheCatalogWithoutRepeatingAnIdentifier() {
        List<AiContext.CatalogExercise> catalog = catalog(8);

        WorkoutProposalPayload payload = provider.proposeWorkout(
                context(TrainingGoal.STRENGTH, 4, catalog), "Monte um treino de força.");

        assertThat(payload.name()).isEqualTo("Treino de força");
        assertThat(payload.goal()).isEqualTo(TrainingGoal.STRENGTH);
        assertThat(payload.days()).hasSize(4);
        assertThat(payload.days())
                .allSatisfy(day -> assertThat(day.exercises()).hasSize(2));

        List<UUID> ids = new ArrayList<>();
        for (WorkoutProposalPayload.Day day : payload.days()) {
            for (WorkoutProposalPayload.PlannedExercise exercise : day.exercises()) {
                ids.add(exercise.exerciseId());
                assertThat(catalog).extracting(AiContext.CatalogExercise::id)
                        .contains(exercise.exerciseId());
                assertThat(exercise.sets()).isEqualTo(4);
                assertThat(exercise.repRange()).isEqualTo(new WorkoutProposalPayload.RepRange(4, 6));
                assertThat(exercise.restSeconds()).isEqualTo(180);
            }
        }
        assertThat(ids).doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("never proposes more days than the number of available exercises")
    void neverProposesMoreDaysThanTheAvailableExercises() {
        WorkoutProposalPayload payload = provider.proposeWorkout(
                context(TrainingGoal.GENERAL, 5, catalog(2)), "Monte um treino.");

        assertThat(payload.days()).hasSize(2);
        assertThat(payload.days()).allSatisfy(day -> assertThat(day.exercises()).hasSize(1));
    }

    @Test
    @DisplayName("refuses to propose a workout with an empty catalog")
    void refusesToProposeAWorkoutWithAnEmptyCatalog() {
        assertThatThrownBy(() -> provider.proposeWorkout(
                context(TrainingGoal.GENERAL, 3, List.of()), "Monte um treino."))
                .isInstanceOf(LlmSchemaException.class);
    }

    @Test
    @DisplayName("interprets two sets separated by a semicolon")
    void interpretsTwoSetsSeparatedByASemicolon() {
        VoiceInterpretationPayload payload = provider.interpretVoice("80 kg 10 reps; 85 kg 8 reps");

        assertThat(payload.sets()).hasSize(2);
        assertThat(payload.sets().get(0).setNumber()).isEqualTo(1);
        assertThat(payload.sets().get(0).weightKg()).isEqualByComparingTo("80");
        assertThat(payload.sets().get(0).repetitions()).isEqualTo(10);
        assertThat(payload.sets().get(1).setNumber()).isEqualTo(2);
        assertThat(payload.sets().get(1).weightKg()).isEqualByComparingTo("85");
        assertThat(payload.sets().get(1).repetitions()).isEqualTo(8);
    }

    @Test
    @DisplayName("accepts the decimal comma and the Portuguese vocabulary")
    void acceptsTheDecimalCommaAndThePortugueseVocabulary() {
        VoiceInterpretationPayload payload = provider.interpretVoice(
                "82,5 kg 10 repetições\n3 segundos 20 metros");

        assertThat(payload.sets()).hasSize(2);
        assertThat(payload.sets().get(0).weightKg()).isEqualByComparingTo("82.5");
        assertThat(payload.sets().get(0).repetitions()).isEqualTo(10);
        assertThat(payload.sets().get(1).durationSeconds()).isEqualTo(3);
        assertThat(payload.sets().get(1).distanceMeters()).isEqualTo(20);
    }

    @Test
    @DisplayName("refuses a transcription without a recognizable set")
    void refusesATranscriptionWithoutARecognizableSet() {
        assertThatThrownBy(() -> provider.interpretVoice("oi, tudo bem?"))
                .isInstanceOf(LlmSchemaException.class);
        assertThatThrownBy(() -> provider.interpretVoice("   "))
                .isInstanceOf(LlmSchemaException.class);
    }

    @Test
    @DisplayName("mentions the recent history in the coaching answer")
    void mentionsTheRecentHistoryInTheCoachingAnswer() {
        String reply = provider.coach(
                context(TrainingGoal.HYPERTROPHY, 4, catalog(2)),
                "3 sessões na última semana, volume de 12 séries",
                "Como estou indo?");

        assertThat(reply).contains("hipertrofia");
        assertThat(reply).contains("4 dia(s) por semana");
        assertThat(reply).contains("3 sessões na última semana, volume de 12 séries");
    }

    @Test
    @DisplayName("reports the provider model name")
    void reportsTheProviderModelName() {
        assertThat(provider.modelName()).isEqualTo(MockLlmProvider.MODEL_NAME);
    }

    private static AiContext context(TrainingGoal goal, int trainingDays,
            List<AiContext.CatalogExercise> catalog) {
        return new AiContext(goal, TrainingExperience.INTERMEDIATE, trainingDays,
                List.of("Barra"), List.of(), catalog);
    }

    private static List<AiContext.CatalogExercise> catalog(int size) {
        List<AiContext.CatalogExercise> exercises = new ArrayList<>();
        for (int index = 0; index < size; index++) {
            exercises.add(new AiContext.CatalogExercise(
                    UUID.randomUUID(),
                    "Exercício " + (index + 1),
                    index % 2 == 0 ? "PEITO" : "COSTAS",
                    "Barra",
                    index % 2 == 0 ? MovementType.COMPOUND : MovementType.ISOLATION));
        }
        return exercises;
    }
}
