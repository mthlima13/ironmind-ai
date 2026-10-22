package com.ironmind.program.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Payload of a training day.
 *
 * @param name      name of the day, for example "Peito e tríceps"
 * @param exercises exercises of the day, in the order they must be stored
 */
public record ProgramDayRequest(
        @NotBlank(message = "O nome do dia é obrigatório.")
        @Size(max = 120, message = "O nome do dia deve ter no máximo 120 caracteres.")
        String name,

        @Valid
        @Size(max = 50, message = "É possível informar no máximo 50 exercícios por dia.")
        List<ProgramExerciseRequest> exercises) {

    /**
     * Canonical representation of the payload, used by the idempotency fingerprint.
     */
    public String canonicalPayload() {
        StringBuilder payload = new StringBuilder();
        payload.append(name == null ? "" : name.trim()).append(':');
        if (exercises != null) {
            for (ProgramExerciseRequest exercise : exercises) {
                payload.append(exercise == null ? "" : exercise.canonicalPayload()).append(',');
            }
        }
        return payload.toString();
    }
}
