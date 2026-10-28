package com.ironmind.workout.dto;

import java.util.UUID;

/**
 * Payload used to start a training session.
 *
 * <p>Both references are optional: {@code null} means a free workout, which starts without
 * exercises. When {@code programDayId} is informed, the exercises of the day are copied into the
 * session, in the same order, with the targets of the program (SPEC.md section 7.8).
 *
 * <p>The owner is never read from the payload: it always comes from the identity header
 * (SPEC.md section 11.7).
 *
 * @param programId    program the session belongs to, {@code null} for a free workout
 * @param programDayId day of the program the session was started from
 */
public record StartSessionRequest(
        UUID programId,
        UUID programDayId) {

    /**
     * Canonical representation of the payload, used to detect an idempotency key replayed with a
     * different body.
     */
    public String canonicalPayload() {
        return (programId == null ? "" : programId.toString()) + "|"
                + (programDayId == null ? "" : programDayId.toString());
    }
}
