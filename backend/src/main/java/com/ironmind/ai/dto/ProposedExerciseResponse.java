package com.ironmind.ai.dto;

import java.util.UUID;

/**
 * Exercise of a validated workout proposal.
 *
 * @param exerciseId         identifier of an existing exercise of the catalog
 * @param name               name of the exercise
 * @param primaryMuscleGroup main muscle group of the exercise
 * @param sets               number of sets
 * @param repsMin            bottom of the repetition range
 * @param repsMax            top of the repetition range
 * @param restSeconds        rest between sets, in seconds
 */
public record ProposedExerciseResponse(
        UUID exerciseId,
        String name,
        String primaryMuscleGroup,
        int sets,
        int repsMin,
        int repsMax,
        int restSeconds) {
}
