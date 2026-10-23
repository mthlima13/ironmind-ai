package com.ironmind.ai.service;

import com.ironmind.ai.config.AiProperties;
import com.ironmind.ai.provider.AiContext;
import com.ironmind.ai.schema.WorkoutProposalPayload;
import com.ironmind.common.exception.AiInvalidResponseException;
import com.ironmind.user.entity.TrainingGoal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Applies the domain rules to a workout proposal (SPEC.md section 12.2, step 6 and 7).
 *
 * <p>Nothing the model says is trusted: an identifier that is not in the catalog of the user is
 * discarded, a repeated exercise is discarded, a value outside the configured bounds is clamped
 * and an exercise blocked by an active restriction never reaches this point because the catalog
 * was already filtered. Every removal or adjustment becomes a warning shown on review, so the
 * user knows exactly what changed.
 */
@Component
public class WorkoutProposalValidator {

    private static final int DEFAULT_SETS = 3;
    private static final int MAX_NAME_LENGTH = 120;
    private static final int MAX_EXPLANATION_LENGTH = 1_000;

    private final AiProperties properties;

    public WorkoutProposalValidator(AiProperties properties) {
        this.properties = properties;
    }

    /**
     * Validates the proposal against the catalog and the configured limits.
     *
     * @param payload structured answer of the model
     * @param context context used to build the prompt
     * @return proposal that can be shown to the user
     * @throws AiInvalidResponseException when nothing usable is left
     */
    public ValidatedWorkoutProposal validate(WorkoutProposalPayload payload, AiContext context) {
        if (payload == null) {
            throw new AiInvalidResponseException("A IA não retornou uma proposta.");
        }

        AiProperties.Limits limits = properties.limits();
        Map<UUID, AiContext.CatalogExercise> catalog = new HashMap<>();
        for (AiContext.CatalogExercise exercise : context.catalog()) {
            catalog.put(exercise.id(), exercise);
        }

        List<String> warnings = new ArrayList<>();
        List<ValidatedWorkoutProposal.Day> days = new ArrayList<>();
        int adjustedValues = 0;
        boolean dayCapWarned = false;
        boolean exerciseCapWarned = false;

        List<WorkoutProposalPayload.Day> payloadDays = payload.days() == null ? List.of() : payload.days();
        for (int dayIndex = 0; dayIndex < payloadDays.size(); dayIndex++) {
            if (days.size() >= limits.maxDays()) {
                if (!dayCapWarned) {
                    warnings.add("A proposta tinha mais de " + limits.maxDays()
                            + " dias; os dias excedentes foram descartados.");
                    dayCapWarned = true;
                }
                break;
            }

            WorkoutProposalPayload.Day payloadDay = payloadDays.get(dayIndex);
            if (payloadDay == null) {
                warnings.add("Um dia vazio da proposta foi descartado.");
                continue;
            }

            String dayName = text(payloadDay.name(), "Dia " + (dayIndex + 1));
            List<ValidatedWorkoutProposal.Exercise> exercises = new ArrayList<>();
            Set<UUID> seenInDay = new HashSet<>();
            int discarded = 0;
            boolean capReached = false;

            List<WorkoutProposalPayload.PlannedExercise> planned =
                    payloadDay.exercises() == null ? List.of() : payloadDay.exercises();
            for (WorkoutProposalPayload.PlannedExercise candidate : planned) {
                if (candidate == null || candidate.exerciseId() == null) {
                    discarded++;
                    continue;
                }
                AiContext.CatalogExercise match = catalog.get(candidate.exerciseId());
                if (match == null || !seenInDay.add(candidate.exerciseId())) {
                    discarded++;
                    continue;
                }
                if (exercises.size() >= limits.maxExercisesPerDay()) {
                    if (!exerciseCapWarned) {
                        warnings.add("Um dia tinha mais de " + limits.maxExercisesPerDay()
                                + " exercícios; os excedentes foram descartados.");
                        exerciseCapWarned = true;
                    }
                    capReached = true;
                    break;
                }

                Bounds bounds = clamp(candidate, limits);
                adjustedValues += bounds.adjusted() ? 1 : 0;
                exercises.add(new ValidatedWorkoutProposal.Exercise(
                        match.id(),
                        match.name(),
                        match.primaryMuscleGroup(),
                        bounds.sets(),
                        bounds.repsMin(),
                        bounds.repsMax(),
                        bounds.restSeconds()));
            }

            if (discarded > 0) {
                warnings.add(discarded + " exercício(s) inválido(s), duplicado(s) ou indisponível(is) "
                        + "foram descartados do dia \"" + dayName + "\".");
            }
            if (exercises.isEmpty()) {
                warnings.add("O dia \"" + dayName + "\" ficou sem exercícios válidos e foi descartado.");
                continue;
            }
            if (capReached) {
                exercises = List.copyOf(exercises);
            }
            days.add(new ValidatedWorkoutProposal.Day(dayName, exercises));
        }

        if (adjustedValues > 0) {
            warnings.add("Séries, repetições ou descanso fora dos limites do aplicativo foram ajustados "
                    + "em " + adjustedValues + " exercício(s).");
        }
        if (days.isEmpty()) {
            throw new AiInvalidResponseException("A proposta não contém nenhum exercício válido.");
        }

        return new ValidatedWorkoutProposal(
                truncate(text(payload.name(), "Proposta de treino"), MAX_NAME_LENGTH),
                goalOf(payload, context),
                days,
                truncate(text(payload.explanation(), "Proposta gerada para revisão do usuário."),
                        MAX_EXPLANATION_LENGTH),
                warnings);
    }

    private static Bounds clamp(WorkoutProposalPayload.PlannedExercise candidate, AiProperties.Limits limits) {
        boolean adjusted = false;

        int sets = candidate.sets() == null ? DEFAULT_SETS : candidate.sets();
        if (sets < AiProperties.Limits.MIN_SETS || sets > limits.maxSets()) {
            adjusted = candidate.sets() != null;
            sets = clampInt(sets, AiProperties.Limits.MIN_SETS, limits.maxSets());
        }

        Integer rawMin = candidate.repRange() == null ? null : candidate.repRange().min();
        Integer rawMax = candidate.repRange() == null ? null : candidate.repRange().max();
        int repsMin = rawMin == null ? limits.defaultRepsMin() : rawMin;
        int repsMax = rawMax == null ? limits.defaultRepsMax() : rawMax;
        if (rawMin != null && (repsMin < AiProperties.Limits.MIN_REPS || repsMin > limits.maxReps())) {
            adjusted = true;
            repsMin = clampInt(repsMin, AiProperties.Limits.MIN_REPS, limits.maxReps());
        }
        if (rawMax != null && (repsMax < AiProperties.Limits.MIN_REPS || repsMax > limits.maxReps())) {
            adjusted = true;
            repsMax = clampInt(repsMax, AiProperties.Limits.MIN_REPS, limits.maxReps());
        }
        if (repsMin > repsMax) {
            adjusted = true;
            int swap = repsMin;
            repsMin = repsMax;
            repsMax = swap;
        }

        int restSeconds = candidate.restSeconds() == null
                ? limits.defaultRestSeconds()
                : candidate.restSeconds();
        if (restSeconds < AiProperties.Limits.MIN_REST_SECONDS || restSeconds > limits.maxRestSeconds()) {
            adjusted = true;
            restSeconds = clampInt(restSeconds, AiProperties.Limits.MIN_REST_SECONDS, limits.maxRestSeconds());
        }

        return new Bounds(sets, repsMin, repsMax, restSeconds, adjusted);
    }

    private static TrainingGoal goalOf(WorkoutProposalPayload payload, AiContext context) {
        if (payload.goal() != null) {
            return payload.goal();
        }
        if (context.goal() != null) {
            return context.goal();
        }
        return TrainingGoal.GENERAL;
    }

    private static int clampInt(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static String text(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.strip();
    }

    private static String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    /**
     * Values of an exercise after the bounds of the application were applied.
     */
    private record Bounds(int sets, int repsMin, int repsMax, int restSeconds, boolean adjusted) {
    }
}
