package com.ironmind.ai.dto;

import com.ironmind.ai.entity.RecommendationStatus;
import java.time.Instant;
import java.util.UUID;

/**
 * Result of the review of a recommendation.
 *
 * @param id             identifier of the recommendation
 * @param status         decision recorded
 * @param acceptedAt     moment of the acceptance, {@code null} when the suggestion was rejected
 * @param savedProgramId program saved from the proposal, {@code null} when none was linked
 */
public record RecommendationDecisionResponse(
        UUID id,
        RecommendationStatus status,
        Instant acceptedAt,
        UUID savedProgramId) {
}
