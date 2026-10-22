package com.ironmind.workout.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Payload used to correct a set already registered.
 *
 * <p>The update is partial: an omitted field keeps the current value. The identifier and the
 * number of the set never change, so the correction keeps the link with the history
 * (SPEC.md section 7.8).
 *
 * <p>The load is kept as raw JSON because {@code null} is a meaningful value there: it is the
 * bodyweight movement. Omitting the field keeps the current load, and sending {@code null}
 * clears it.
 *
 * @param weightKg          new load in kilograms, {@code null} for bodyweight movements
 * @param repetitions       new number of repetitions
 * @param durationSeconds   new duration of the set
 * @param distanceMeters    new distance of the set
 * @param perceivedExertion new rate of perceived exertion, from 1 to 10
 * @param restAfterSeconds  new rest taken after the set
 */
public record UpdateSetRequest(
        JsonNode weightKg,

        @Min(value = 0, message = "O número de repetições deve ser maior ou igual a zero.")
        Integer repetitions,

        @Min(value = 0, message = "A duração deve ser maior ou igual a zero.")
        Integer durationSeconds,

        @Min(value = 0, message = "A distância deve ser maior ou igual a zero.")
        Integer distanceMeters,

        @Min(value = 1, message = "O esforço percebido deve estar entre 1 e 10.")
        @Max(value = 10, message = "O esforço percebido deve estar entre 1 e 10.")
        Short perceivedExertion,

        @Min(value = 0, message = "O descanso deve ser maior ou igual a zero.")
        Integer restAfterSeconds) {
}
