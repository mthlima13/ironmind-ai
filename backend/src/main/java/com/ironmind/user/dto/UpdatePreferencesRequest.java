package com.ironmind.user.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.ironmind.user.entity.PreferredUnits;
import com.ironmind.user.entity.TrainingExperience;
import com.ironmind.user.entity.TrainingGoal;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Payload used to update the preferences of the user.
 *
 * <p>Every field is optional and the update is merged field by field: an omitted field keeps the
 * current value.
 *
 * @param preferredUnits     new unit system preferred by the user
 * @param trainingExperience new experience of the user
 * @param goal               new goal of the training
 * @param availableEquipment new list of available equipment, kept as raw JSON so the service can
 *                           reject a value that is not a list of texts with the name of the field
 * @param trainingDays       new number of training days per week
 * @param privacySettings    new visibility settings, merged field by field
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record UpdatePreferencesRequest(
        PreferredUnits preferredUnits,

        TrainingExperience trainingExperience,

        TrainingGoal goal,

        JsonNode availableEquipment,

        @Min(value = 1, message = "O número de dias de treino deve estar entre 1 e 7.")
        @Max(value = 7, message = "O número de dias de treino deve estar entre 1 e 7.")
        Integer trainingDays,

        PrivacySettings privacySettings) {
}
