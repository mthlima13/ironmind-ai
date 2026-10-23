package com.ironmind.ai.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Recommendation produced by the AI service and reviewed by the user (SPEC.md section 10.13).
 *
 * <p>The row is written by the backend, never by the model, and only after the structured answer
 * passed the domain validation. The free text of the conversation is not stored: {@code input}
 * keeps a short summary without sensitive data and {@code result} keeps the validated structure.
 */
@Entity
@Table(name = "ai_recommendations")
public class AiRecommendation {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "recommendation_type", nullable = false)
    private RecommendationType type;

    @Column(name = "input_summary", columnDefinition = "text")
    private String inputSummary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_json", nullable = false)
    private Map<String, Object> result;

    @Column(name = "model_version", length = 120)
    private String modelVersion;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RecommendationStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "accepted_at")
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
