package com.ironmind.workout.dto;

import com.ironmind.workout.entity.SessionStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Payload used to change the state of a session.
 *
 * <p>Only the reversible transitions are accepted here: pausing, resuming and abandoning. The
 * session is concluded by the dedicated endpoint, which also stamps the moment it ended
 * (SPEC.md section 7.8).
 *
 * @param status new state of the session
 * @param notes  observations of the user about the session
 */
public record UpdateSessionStatusRequest(
        @NotNull(message = "O estado da sessão é obrigatório.")
        SessionStatus status,

        @Size(max = 2000, message = "As observações devem ter no máximo 2000 caracteres.")
        String notes) {
}
