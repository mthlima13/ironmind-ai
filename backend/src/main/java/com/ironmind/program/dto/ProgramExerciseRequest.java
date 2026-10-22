package com.ironmind.program.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Payload of an exercise inside a training day.
 *
 * <p>The exercise always comes from the catalog: an identifier that does not exist is refused by
 * the service with the path of the field, so the client can point the user to the right input.
 *
 * @param exerciseId    identifier of the exercise of the catalog
 * @param targetSets    number of target sets
 * @param targetRepsMin smallest number of target repetitions
 * @param targetRepsMax biggest number of target repetitions
 * @param restSeconds   rest between the sets, in seconds
 * @param notes         observations of the user
 */
public record ProgramExerciseRequest(
        @NotNull(message = "O exercício é obrigatório.")
        UUID exerciseId,

        @NotNull(message = "O número de séries é obrigatório.")
        @Min(value = 1, message = "O número de séries deve ser no mínimo 1.")
        @Max(value = 50, message = "O número de séries deve ser no máximo 50.")
        Integer targetSets,

        @NotNull(message = "O número mínimo de repetições é obrigatório.")
        @Min(value = 0, message = "O número mínimo de repetições deve ser no mínimo 0.")
        @Max(value = 1000, message = "O número mínimo de repetições deve ser no máximo 1000.")
        Integer targetRepsMin,

        @NotNull(message = "O número máximo de repetições é obrigatório.")
        @Min(value = 0, message = "O número máximo de repetições deve ser no mínimo 0.")
        @Max(value = 1000, message = "O número máximo de repetições deve ser no máximo 1000.")
        Integer targetRepsMax,

        @NotNull(message = "O tempo de descanso é obrigatório.")
        @Min(value = 0, message = "O tempo de descanso deve ser no mínimo 0.")
        @Max(value = 600, message = "O tempo de descanso deve ser no máximo 600 segundos.")
        Integer restSeconds,

        @Size(max = 500, message = "As observações devem ter no máximo 500 caracteres.")
        String notes) {

    /**
     * Canonical representation of the payload, used by the idempotency fingerprint.
     */
    public String canonicalPayload() {
        return String.join("|",
                exerciseId == null ? "" : exerciseId.toString(),
                targetSets == null ? "" : targetSets.toString(),
                targetRepsMin == null ? "" : targetRepsMin.toString(),
                targetRepsMax == null ? "" : targetRepsMax.toString(),
                restSeconds == null ? "" : restSeconds.toString(),
                notes == null ? "" : notes.trim());
    }
}
