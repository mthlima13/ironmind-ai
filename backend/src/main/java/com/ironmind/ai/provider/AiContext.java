package com.ironmind.ai.provider;

import com.ironmind.exercise.entity.MovementType;
import com.ironmind.user.entity.TrainingExperience;
import com.ironmind.user.entity.TrainingGoal;
import java.util.List;
import java.util.UUID;

/**
 * Minimum context sent to the language model (SPEC.md section 12.2, step 3).
 *
 * <p>Only what the model needs to propose a workout travels: the preferences, the body regions of
 * the active restrictions and the exercises the user can actually perform. The free text of a
 * restriction and any other health detail stay in the backend.
 *
 * @param goal                goal of the training
 * @param experience          experience of the user with the training
 * @param trainingDays        number of training days per week
 * @param availableEquipment  equipment informed by the user, empty when unspecified
 * @param restrictionRegions  body regions of the active restrictions
 * @param catalog             exercises visible to the user, already filtered and capped
 */
public record AiContext(
        TrainingGoal goal,
        TrainingExperience experience,
        int trainingDays,
        List<String> availableEquipment,
        List<String> restrictionRegions,
        List<CatalogExercise> catalog) {

    public AiContext {
        availableEquipment = availableEquipment == null ? List.of() : List.copyOf(availableEquipment);
        restrictionRegions = restrictionRegions == null ? List.of() : List.copyOf(restrictionRegions);
        catalog = catalog == null ? List.of() : List.copyOf(catalog);
    }

    /**
     * Exercise of the catalog as seen by the model.
     *
     * @param id                 identifier of the exercise
     * @param name               name of the exercise
     * @param primaryMuscleGroup main muscle group of the movement
     * @param equipment          equipment required by the movement
     * @param movementType       kind of movement
     */
    public record CatalogExercise(
            UUID id,
            String name,
            String primaryMuscleGroup,
            String equipment,
            MovementType movementType) {
    }

    /**
     * Tells whether the user informed the available equipment.
     */
    public boolean hasEquipmentInformation() {
        return !availableEquipment.isEmpty();
    }
}
