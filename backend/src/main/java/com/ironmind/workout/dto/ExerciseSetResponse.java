package com.ironmind.workout.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.ironmind.workout.entity.ExerciseSet;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Representation of a set registered in a session, returned by the API.
 *
 * <p>The load is stored in kilograms, the canonical unit of the product: the application
 * converts it only for the presentation (SPEC.md section 7.2).
 *
 * @param id                identifier of the set
 * @param setNumber         position of the set inside the exercise of the session, assigned by the
 *                          server
 * @param weightKg          load in kilograms, {@code null} for bodyweight movements
 * @param repetitions       number of repetitions
 * @param durationSeconds   duration of the set, for isometric and cardio movements
 * @param distanceMeters    distance of the set, for cardio movements
 * @param perceivedExertion rate of perceived exertion, from 1 to 10
 * @param restAfterSeconds  rest taken after the set
 * @param completedAt       moment the set was completed
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record ExerciseSetResponse(
        UUID id,
        int setNumber,
        BigDecimal weightKg,
        int repetitions,
        Integer durationSeconds,
        Integer distanceMeters,
        Short perceivedExertion,
        Integer restAfterSeconds,
        Instant completedAt) {

    /**
     * Maps the entity into the API representation.
     */
    public static ExerciseSetResponse from(ExerciseSet set) {
        return new ExerciseSetResponse(
                set.getId(),
                set.getSetNumber(),
                set.getWeightKg(),
                set.getRepetitions(),
                set.getDurationSeconds(),
                set.getDistanceMeters(),
                set.getPerceivedExertion(),
                set.getRestAfterSeconds(),
                set.getCompletedAt());
    }
}
