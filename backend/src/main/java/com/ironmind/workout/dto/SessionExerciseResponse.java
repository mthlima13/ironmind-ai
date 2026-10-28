package com.ironmind.workout.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.ironmind.exercise.dto.ExerciseResponse;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.workout.entity.ExerciseSet;
import com.ironmind.workout.entity.SessionExercise;
import java.util.List;
import java.util.UUID;

/**
 * Representation of an exercise performed inside a session, returned by the API.
 *
 * <p>The exercise of the catalog travels with the entry, so the application does not need a
 * second call to draw the screen of the workout.
 *
 * @param id         identifier of the entry
 * @param exerciseId identifier of the exercise of the catalog
 * @param exercise   exercise of the catalog, embedded in the answer
 * @param position   position of the exercise inside the session, starting at one
 * @param notes      observations of the user about the exercise
 * @param sets       sets registered for the exercise, ordered by their number
 * @param targetSets number of sets planned, {@code null} for a free session
 * @param targetRepsMin lower bound of the planned repetitions
 * @param targetRepsMax upper bound of the planned repetitions
 * @param restSeconds rest between the sets, in seconds
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record SessionExerciseResponse(
        UUID id,
        UUID exerciseId,
        ExerciseResponse exercise,
        int position,
        String notes,
        List<ExerciseSetResponse> sets,
        Integer targetSets,
        Integer targetRepsMin,
        Integer targetRepsMax,
        Integer restSeconds) {

    /**
     * Maps the entity into the API representation, with the sets already ordered.
     */
    public static SessionExerciseResponse from(SessionExercise sessionExercise, Exercise exercise,
            List<ExerciseSet> sets) {
        return new SessionExerciseResponse(
                sessionExercise.getId(),
                sessionExercise.getExerciseId(),
                ExerciseResponse.from(exercise),
                sessionExercise.getPosition(),
                sessionExercise.getNotes(),
                sets.stream().map(ExerciseSetResponse::from).toList(),
                sessionExercise.getTargetSets(),
                sessionExercise.getTargetRepsMin(),
                sessionExercise.getTargetRepsMax(),
                sessionExercise.getRestSeconds());
    }
}
