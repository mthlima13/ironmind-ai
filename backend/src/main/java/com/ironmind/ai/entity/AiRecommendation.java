package com.ironmind.ai.entity;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Recommendation produced by the AI service and reviewed by the user (SPEC.md section 10.13).
 *
 * <p>The document is written by the backend, never by the model, and only after the structured
 * answer passed the domain validation. The free text of the conversation is not stored:
 * {@code inputSummary} keeps a short summary without sensitive data and {@code result} keeps the
 * validated structure.
 */
@Document(collection = "ai_recommendations")
public class AiRecommendation {

    @Id
    private UUID id;

    @Indexed
    private UUID userId;

    private RecommendationType type;

    private String inputSummary;

    private Map<String, Object> result = new LinkedHashMap<>();

    private String modelVersion;

    private RecommendationStatus status;

    private Instant createdAt;

    private Instant acceptedAt;

    protected AiRecommendation() {
    }

    /**
     * Creates a pending recommendation.
     *
     * @param id           identifier of the recommendation
     * @param userId       owner of the recommendation
     * @param type         kind of recommendation
     * @param inputSummary short summary of the input, without sensitive data
     * @param result       structured and validated output
     * @param modelVersion model and version that produced the output
     * @param createdAt    moment of the creation
     */
    public AiRecommendation(UUID id, UUID userId, RecommendationType type, String inputSummary,
            Map<String, Object> result, String modelVersion, Instant createdAt) {
        this.id = Objects.requireNonNull(id, "id");
        this.userId = Objects.requireNonNull(userId, "userId");
        this.type = Objects.requireNonNull(type, "type");
        this.inputSummary = inputSummary;
        this.result = result == null ? new LinkedHashMap<>() : new LinkedHashMap<>(result);
        this.modelVersion = modelVersion;
        this.status = RecommendationStatus.PENDING;
        this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public RecommendationType getType() {
        return type;
    }

    public String getInputSummary() {
        return inputSummary;
    }

    public Map<String, Object> getResult() {
        return result == null ? Map.of() : Map.copyOf(result);
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public RecommendationStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getAcceptedAt() {
        return acceptedAt;
    }

    /**
     * Tells whether the recommendation is waiting for the review of the user.
     */
    public boolean isPending() {
        return status == RecommendationStatus.PENDING;
    }

    /**
     * Records the decision of the user.
     *
     * @param newStatus decision of the user, never {@code PENDING} or {@code ERROR}
     * @param at        moment of the decision
     * @param result    result to keep, {@code null} to preserve the current one
     */
    public void decide(RecommendationStatus newStatus, Instant at, Map<String, Object> result) {
        if (newStatus == null || newStatus == RecommendationStatus.PENDING || newStatus == RecommendationStatus.ERROR) {
            throw new IllegalArgumentException("A decision must be ACCEPTED, EDITED or REJECTED");
        }
        if (!isPending()) {
            throw new IllegalStateException("The recommendation was already reviewed");
        }
        this.status = newStatus;
        this.acceptedAt = newStatus == RecommendationStatus.REJECTED ? null : Objects.requireNonNull(at, "at");
        if (result != null) {
            this.result = new LinkedHashMap<>(result);
        }
    }
}
