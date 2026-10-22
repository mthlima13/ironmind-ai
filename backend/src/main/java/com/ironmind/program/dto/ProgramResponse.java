package com.ironmind.program.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ironmind.program.entity.SplitType;
import com.ironmind.program.entity.WorkoutProgram;
import com.ironmind.user.entity.TrainingGoal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Representation of a training program returned by the API.
 *
 * @param id          identifier of the program
 * @param name        name of the program
 * @param description short description of the program
 * @param goal        goal of the training
 * @param splitType   division of the training
 * @param isArchived  whether the program is archived
 * @param createdAt   moment of the creation
 * @param days        days of the program, ordered by position
 */
public record ProgramResponse(
        UUID id,
        String name,
        String description,
        TrainingGoal goal,
        SplitType splitType,
        @JsonProperty("isArchived") boolean isArchived,
        Instant createdAt,
        List<ProgramDayResponse> days) {

    /**
     * Maps the entity into the API representation.
     */
    public static ProgramResponse from(WorkoutProgram program, List<ProgramDayResponse> days) {
        return new ProgramResponse(
                program.getId(),
                program.getName(),
                program.getDescription(),
                program.getGoal(),
                program.getSplitType(),
                program.isArchived(),
                program.getCreatedAt(),
                days);
    }
}
