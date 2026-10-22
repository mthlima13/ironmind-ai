package com.ironmind.workout.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Payload used to register a set inside a session.
 *
 * <p>The number of the set is assigned by the server: it is the position of the set inside the
 * exercise of the session, and it never comes from the body (SPEC.md section 7.8).
 *
 * @param sessionExerciseId identifier of the exercise of the session the set belongs to
 * @param weightKg          load in kilograms, the canonical unit of the product; {@code null} for
 *                          bodyweight movements
 * @param repetitions       number of repetitions
 * @param durationSeconds   duration of the set, for isometric and cardio movements
 * @param distanceMeters    distance of the set, for cardio movements
 * @param perceivedExertion rate of perceived exertion, from 1 to 10
 * @param restAfterSeconds  rest taken after the set
 */
public record RegisterSetRequest(
        @NotNull(message = "O exercício da sessão é obrigatório.")
        UUID sessionExerciseId,

        @DecimalMin(value = "0.00", message = "A carga deve ser maior ou igual a zero.")
        @Digits(integer = 4, fraction = 2, message = "A carga deve ter no máximo 4 dígitos e 2 casas decimais.")
        BigDecimal weightKg,

        @NotNull(message = "O número de repetições é obrigatório.")
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
