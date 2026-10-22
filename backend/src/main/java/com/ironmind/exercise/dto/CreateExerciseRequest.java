package com.ironmind.exercise.dto;

import com.ironmind.exercise.entity.MovementType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Payload used to create a personal exercise.
 *
 * @param name                 name of the exercise
 * @param description          short description of the movement
 * @param primaryMuscleGroup   main muscle group of the movement
 * @param secondaryMuscleGroups auxiliary muscle groups of the movement
 * @param equipment            equipment required by the movement
 * @param instructions         execution instructions
 * @param movementType         kind of movement
 */
public record CreateExerciseRequest(
        @NotBlank(message = "O nome do exercício é obrigatório.")
        @Size(max = 120, message = "O nome do exercício deve ter no máximo 120 caracteres.")
        String name,

        @Size(max = 2000, message = "A descrição deve ter no máximo 2000 caracteres.")
        String description,

        @NotBlank(message = "O grupo muscular principal é obrigatório.")
        @Size(max = 60, message = "O grupo muscular principal deve ter no máximo 60 caracteres.")
        String primaryMuscleGroup,

        @Size(max = 10, message = "É possível informar no máximo 10 grupos musculares secundários.")
        List<@Size(max = 60, message = "Cada grupo muscular secundário deve ter no máximo 60 caracteres.")
                String> secondaryMuscleGroups,

        @NotBlank(message = "O equipamento é obrigatório.")
        @Size(max = 60, message = "O equipamento deve ter no máximo 60 caracteres.")
        String equipment,

        @Size(max = 4000, message = "As instruções devem ter no máximo 4000 caracteres.")
        String instructions,

        @NotNull(message = "O tipo de movimento é obrigatório.")
        MovementType movementType) {

    /**
     * Canonical representation of the payload, used to detect an idempotency key replayed with a
     * different body.
     */
    public String canonicalPayload() {
        return String.join("|",
                nullSafe(name),
                nullSafe(description),
                nullSafe(primaryMuscleGroup),
                secondaryMuscleGroups == null ? "" : String.join(",", secondaryMuscleGroups),
                nullSafe(equipment),
                nullSafe(instructions),
                movementType == null ? "" : movementType.name());
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }
}
