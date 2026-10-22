package com.ironmind.workout.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Representation of a training session returned by the API.
 *
 * <p>The exercises and the sets travel inside the session: the history and the quick fill
 * shortcut are built from this answer alone (SPEC.md section 7.8).
 *
 * @param id          identifier of the session
 * @param programId   program the session belongs to, {@code null} for a free workout
 * @param programDayId day of the program the session was started from
 * @param startedAt   moment the session started
 * @param completedAt moment the session ended, {@code null} while it is not finished
 * @param status      current state of the session
 * @param notes       observations of the user about the session
 * @param exercises   exercises performed in the session, ordered by their position
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record SessionResponse(
        UUID id,
        UUID programId,
        UUID programDayId,
        Instant startedAt,
        Instant completedAt,
        SessionStatus status,
        String notes,
        List<SessionExerciseResponse> exercises) {

    /**
     * Maps the entity into the API representation.
     */
    public static SessionResponse from(WorkoutSession session, List<SessionExerciseResponse> exercises) {
        return new SessionResponse(
                session.getId(),
                session.getProgramId(),
                session.getProgramDayId(),
                session.getStartedAt(),
                session.getCompletedAt(),
                session.getStatus(),
                session.getNotes(),
                exercises);
    }
}
