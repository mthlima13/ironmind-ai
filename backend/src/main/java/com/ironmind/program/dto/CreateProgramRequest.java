package com.ironmind.program.dto;

import com.ironmind.program.entity.SplitType;
import com.ironmind.user.entity.TrainingGoal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Payload used to create or to replace a training program.
 *
 * <p>The update of a program replaces the whole structure: the days and the exercises of the
 * body are the new structure of the program, and the entries that are not sent are removed. The
 * owner is never read from the payload: it always comes from the access token
 * (SPEC.md section 11.7).
 *
 * @param name        name of the program
 * @param description short description of the program
 * @param goal        goal of the training
 * @param splitType   division of the training
 * @param days        days of the program, in the order they must be stored
 */
public record CreateProgramRequest(
        @NotBlank(message = "O nome do programa é obrigatório.")
        @Size(max = 120, message = "O nome do programa deve ter no máximo 120 caracteres.")
        String name,

        @Size(max = 2000, message = "A descrição deve ter no máximo 2000 caracteres.")
        String description,

        @NotNull(message = "O objetivo do programa é obrigatório.")
        TrainingGoal goal,

        @NotNull(message = "A divisão do programa é obrigatória.")
        SplitType splitType,

        @Valid
        @Size(max = 14, message = "É possível informar no máximo 14 dias de treino.")
        List<ProgramDayRequest> days) {

    /**
     * Canonical representation of the payload, used to detect an idempotency key replayed with a
     * different body.
     */
    public String canonicalPayload() {
        StringBuilder payload = new StringBuilder();
        payload.append(nullSafe(name)).append('|')
                .append(nullSafe(description)).append('|')
                .append(goal == null ? "" : goal.name()).append('|')
                .append(splitType == null ? "" : splitType.name()).append('|');
        if (days != null) {
            for (ProgramDayRequest day : days) {
                payload.append(day == null ? "" : day.canonicalPayload()).append(';');
            }
        }
        return payload.toString();
    }

    private static String nullSafe(String value) {
        return value == null ? "" : value.trim();
    }
}
