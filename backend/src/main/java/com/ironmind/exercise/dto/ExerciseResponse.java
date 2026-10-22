package com.ironmind.exercise.dto;

import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.entity.MovementType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Representation of an exercise returned by the API.
 *
 * @param id                   identifier of the exercise
 * @param name                 name of the exercise
 * @param description          short description of the movement
 * @param primaryMuscleGroup   main muscle group of the movement
 * @param secondaryMuscleGroups auxiliary muscle groups of the movement
 * @param equipment            equipment required by the movement
 * @param instructions         execution instructions
 * @param movementType         kind of movement
 * @param isSystem             whether the exercise belongs to the global catalog
 * @param createdByUserId      owner of a personal exercise, {@code null} for the global catalog
 * @param createdAt            moment of the creation
 * @param updatedAt            moment of the last update
 */
public record ExerciseResponse(
        UUID id,
        String name,
        String description,
        String primaryMuscleGroup,
        List<String> secondaryMuscleGroups,
        String equipment,
        String instructions,
        MovementType movementType,
        boolean isSystem,
        UUID createdByUserId,
        Instant createdAt,
        Instant updatedAt) {

    /**
     * Maps the entity into the API representation.
     */
    public static ExerciseResponse from(Exercise exercise) {
        return new ExerciseResponse(
                exercise.getId(),
                exercise.getName(),
                exercise.getDescription(),
                exercise.getPrimaryMuscleGroup(),
                exercise.getSecondaryMuscleGroups(),
                exercise.getEquipment(),
                exercise.getInstructions(),
                exercise.getMovementType(),
                exercise.isSystem(),
                exercise.getCreatedByUserId(),
                exercise.getCreatedAt(),
                exercise.getUpdatedAt());
    }
}
