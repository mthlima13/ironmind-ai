package com.ironmind.ai.schema;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ironmind.program.entity.SplitType;
import com.ironmind.user.entity.TrainingGoal;
import java.util.List;
import java.util.UUID;

/**
 * Structured answer of the model for a workout proposal (SPEC.md section 12.2).
 *
 * <p>This type is the schema of the output: the raw text of the model is deserialized into it and
 * everything that does not fit is ignored. The domain rules (exercise visibility, bounds and
 * restrictions) are applied by the backend afterwards, never by the model.
 *
 * @param name        name of the proposed program
 * @param goal        goal of the proposed program
 * @param days        days of the proposed program
 * @param explanation short explanation of the proposal, shown to the user on review
 * @param splitType   division suggested by the model, {@code null} when it did not suggest one
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record WorkoutProposalPayload(
        String name,
        TrainingGoal goal,
        List<Day> days,
        String explanation,
        SplitType splitType) {

    /**
     * Builds a payload without a division, used by the tests and by providers that do not choose it.
     */
    public WorkoutProposalPayload(String name, TrainingGoal goal, List<Day> days, String explanation) {
        this(name, goal, days, explanation, null);
    }

    /**
     * Day of the proposed program.
     *
     * @param name      name of the day
     * @param exercises exercises proposed for the day
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Day(String name, List<PlannedExercise> exercises) {
    }

    /**
     * Exercise proposed for a day.
     *
     * @param exerciseId  identifier of an existing exercise, never invented by the backend
     * @param sets        number of sets
     * @param repRange    range of repetitions
     * @param restSeconds rest between sets, in seconds
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PlannedExercise(
            UUID exerciseId,
            Integer sets,
            RepRange repRange,
            Integer restSeconds) {
    }

    /**
     * Range of repetitions of an exercise.
     *
     * @param min bottom of the range
     * @param max top of the range
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RepRange(Integer min, Integer max) {
    }
}
