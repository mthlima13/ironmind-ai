package com.ironmind.ai.dto;

import com.ironmind.program.entity.SplitType;
import com.ironmind.user.entity.TrainingGoal;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request of a workout proposal (SPEC.md section 11.6).
 *
 * <p>The owner is never read from the body: it always comes from the identity header. The prompt is
 * natural language and is not persisted.
 *
 * @param prompt       what the user wants, in natural language
 * @param trainingDays number of training days asked, {@code null} to use the preferences
 * @param goal         goal asked, {@code null} to use the preferences
 * @param splitType    division chosen by the user, {@code null} to let the model choose
 */
public record WorkoutProposalRequest(
        @NotBlank(message = "Descreva o treino que você quer.")
        @Size(max = 1_000, message = "O pedido deve ter no máximo 1000 caracteres.")
        String prompt,

        @Min(value = 1, message = "Informe ao menos 1 dia de treino.")
        @Max(value = 7, message = "Informe no máximo 7 dias de treino.")
        Integer trainingDays,

        TrainingGoal goal,

        SplitType splitType) {
}
