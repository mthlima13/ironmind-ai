package com.ironmind.exercise.dto;

import com.ironmind.exercise.entity.MovementType;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Payload used to update a personal exercise.
 *
 * <p>Every field is optional: only the informed fields are changed.
 *
 * @param name                 new name of the exercise
 * @param description          new description of the movement
 * @param primaryMuscleGroup   new main muscle group of the movement
 * @param secondaryMuscleGroups new auxiliary muscle groups of the movement
 * @param equipment            new equipment required by the movement
 * @param instructions         new execution instructions
 * @param movementType         new kind of movement
 */
public record UpdateExerciseRequest(
        @Size(max = 120, message = "O nome do exercício deve ter no máximo 120 caracteres.")
        String name,

        @Size(max = 2000, message = "A descrição deve ter no máximo 2000 caracteres.")
        String description,

        @Size(max = 60, message = "O grupo muscular principal deve ter no máximo 60 caracteres.")
        String primaryMuscleGroup,

        @Size(max = 10, message = "É possível informar no máximo 10 grupos musculares secundários.")
        List<@Size(max = 60, message = "Cada grupo muscular secundário deve ter no máximo 60 caracteres.")
                String> secondaryMuscleGroups,

        @Size(max = 60, message = "O equipamento deve ter no máximo 60 caracteres.")
        String equipment,

        @Size(max = 4000, message = "As instruções devem ter no máximo 4000 caracteres.")
        String instructions,

        MovementType movementType) {
}
