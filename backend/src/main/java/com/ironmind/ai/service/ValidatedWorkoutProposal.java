package com.ironmind.ai.service;

import com.ironmind.program.entity.SplitType;
import com.ironmind.user.entity.TrainingGoal;
import java.util.List;
import java.util.UUID;

/**
 * Workout proposal that survived the domain validation.
 *
 * <p>Only this type reaches the user and the database: identifiers exist in the visible catalog,
 * repeated references are gone, bounds are clamped and every exercise respects the active
 * restrictions (SPEC.md section 12.2, step 6 and 7).
 *
 * @param name        name of the program
 * @param goal        goal of the program
 * @param days        validated days
 * @param explanation explanation shown to the user on review
 * @param warnings    adjustments and removals that the user must know about
 * @param splitType   division of the program, never {@code null}
 */
public record ValidatedWorkoutProposal(
        String name,
        TrainingGoal goal,
        List<Day> days,
        String explanation,
        List<String> warnings,
        SplitType splitType) {

    public ValidatedWorkoutProposal {
        days = days == null ? List.of() : List.copyOf(days);
        warnings = warnings == null ? List.of() : List.copyOf(warnings);
    }

    /**
     * Builds a validated proposal without a division, used by the tests.
     */
    public ValidatedWorkoutProposal(String name, TrainingGoal goal, List<Day> days,
            String explanation, List<String> warnings) {
        this(name, goal, days, explanation, warnings, SplitType.CUSTOM);
    }

    /**
     * Validated day of the proposal.
     *
     * @param name      name of the day
     * @param exercises validated exercises of the day
     */
    public record Day(String name, List<Exercise> exercises) {

        public Day {
            exercises = exercises == null ? List.of() : List.copyOf(exercises);
        }
    }

    /**
     * Validated exercise of the proposal.
     *
     * @param exerciseId         identifier of the exercise in the catalog
     * @param name               name of the exercise
     * @param primaryMuscleGroup main muscle group of the exercise
     * @param sets               number of sets inside the configured bounds
     * @param repsMin            bottom of the repetition range
     * @param repsMax            top of the repetition range
     * @param restSeconds        rest between sets, in seconds
     */
    public record Exercise(
            UUID exerciseId,
            String name,
            String primaryMuscleGroup,
            int sets,
            int repsMin,
            int repsMax,
            int restSeconds) {
    }
}
