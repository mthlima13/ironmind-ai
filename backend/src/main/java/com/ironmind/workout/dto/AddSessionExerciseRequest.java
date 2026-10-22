package com.ironmind.workout.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Payload used to add an exercise to a running session.
 *
 * <p>The exercise must exist in the catalog: an identifier that does not exist is refused with
 * {@code 422} and the path of the rejected field (SPEC.md section 7.8).
 *
 * @param exerciseId identifier of the exercise of the catalog
 * @param position   position of the exercise inside the session, starting at one; when it is
 *                   omitted the exercise is added at the end of the session
 * @param notes      observations of the user about the exercise
 */
public record AddSessionExerciseRequest(
        @NotNull(message = "O exercício é obrigatório.")
        UUID exerciseId,

        @Min(value = 1, message = "A posição deve ser maior ou igual a um.")
        Integer position,

        @Size(max = 2000, message = "As observações devem ter no máximo 2000 caracteres.")
        String notes) {

    /**
     * Canonical representation of the payload, used to detect an idempotency key replayed with a
     * different body.
     */
    public String canonicalPayload() {
        return exerciseId + "|" + (position == null ? "" : position.toString()) + "|"
                + (notes == null ? "" : notes.trim());
    }
}
