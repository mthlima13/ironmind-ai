package com.ironmind.program.dto;

import com.ironmind.exercise.dto.ExerciseResponse;
import com.ironmind.program.entity.ProgramExercise;
import java.util.UUID;

/**
 * Representation of an exercise of a program day returned by the API.
 *
 * @param id            identifier of the entry
 * @param exerciseId    identifier of the exercise of the catalog
 * @param exercise      exercise of the catalog, embedded in the answer
 * @param position      position of the exercise inside the day, starting at one
 * @param targetSets    number of target sets
 * @param targetRepsMin smallest number of target repetitions
 * @param targetRepsMax biggest number of target repetitions
 * @param restSeconds   rest between the sets, in seconds
 * @param notes         observations of the user
 */
public record ProgramExerciseResponse(
        UUID id,
        UUID exerciseId,
        ExerciseResponse exercise,
        int position,
        int targetSets,
        int targetRepsMin,
        int targetRepsMax,
        Integer restSeconds,
        String notes) {

    /**
     * Maps the entity into the API representation.
     */
    public static ProgramExerciseResponse from(ProgramExercise programExercise) {
        return new ProgramExerciseResponse(
                programExercise.getId(),
                programExercise.getExercise().getId(),
                ExerciseResponse.from(programExercise.getExercise()),
                programExercise.getPosition(),
                programExercise.getTargetSets(),
                programExercise.getTargetRepsMin(),
                programExercise.getTargetRepsMax(),
                programExercise.getRestSeconds(),
                programExercise.getNotes());
    }
}
