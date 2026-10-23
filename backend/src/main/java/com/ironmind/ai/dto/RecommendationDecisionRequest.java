package com.ironmind.ai.dto;

import com.ironmind.ai.entity.RecommendationStatus;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Decision of the user about a recommendation (SPEC.md section 12.2, step 8 and 12.3, item 6).
 *
 * <p>The decision records the quality of the suggestion for a future evaluation. Saving a
 * reviewed proposal as a program still happens through the program endpoints; the identifier of
 * that program may be linked here.
 *
 * @param status     decision, one of {@code ACCEPTED}, {@code EDITED} or {@code REJECTED}
 * @param programId  program saved by the user from the proposal, {@code null} when none was saved
 */
public record RecommendationDecisionRequest(
        @NotNull(message = "Informe a decisão.")
        RecommendationStatus status,

        UUID programId) {
}
