package com.ironmind.program.dto;

import com.ironmind.program.entity.ProgramDay;
import java.util.List;
import java.util.UUID;

/**
 * Representation of a training day returned by the API.
 *
 * @param id        identifier of the day
 * @param programId identifier of the program the day belongs to
 * @param name      name of the day
 * @param position  position of the day inside the program, starting at one
 * @param exercises exercises of the day, ordered by position
 */
public record ProgramDayResponse(
        UUID id,
        UUID programId,
        String name,
        int position,
        List<ProgramExerciseResponse> exercises) {

    /**
     * Maps the entity into the API representation.
     *
     * @param day       day of the program
     * @param exercises exercises of the day, ordered by position
     */
    public static ProgramDayResponse from(ProgramDay day, List<ProgramExerciseResponse> exercises) {
        return new ProgramDayResponse(
                day.getId(),
                day.getProgram().getId(),
                day.getName(),
                day.getPosition(),
                exercises);
    }
}
