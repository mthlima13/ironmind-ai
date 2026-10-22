package com.ironmind.workout.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Set registered for an exercise of a session.
 *
 * <p>The load is stored in kilograms, the canonical unit of the product. It is {@code null} for
 * bodyweight movements.
 */
@Entity
@Table(name = "exercise_sets")
public class ExerciseSet {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_exercise_id", nullable = false)
    private SessionExercise sessionExercise;

    @Column(name = "set_number", nullable = false)
    private int setNumber;

    @Column(name = "weight_kg", precision = 6, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "repetitions", nullable = false)
    private int repetitions;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "distance_meters")
    private Integer distanceMeters;

    @Column(name = "perceived_exertion")
    private Short perceivedExertion;

    @Column(name = "rest_after_seconds")
    private Integer restAfterSeconds;

    @Column(name = "completed_at", nullable = false)
    private Instant completedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "idempotency_key", length = 120, unique = true)
    private String idempotencyKey;

    protected ExerciseSet() {
    }

    public ExerciseSet(UUID id, SessionExercise sessionExercise, int setNumber, BigDecimal weightKg, int repetitions) {
        this.id = id;
        this.sessionExercise = sessionExercise;
        this.setNumber = setNumber;
        this.weightKg = weightKg;
        this.repetitions = repetitions;
        this.completedAt = Instant.now();
        this.createdAt = this.completedAt;
    }

    public UUID getId() {
        return id;
    }

    public SessionExercise getSessionExercise() {
        return sessionExercise;
    }

    public int getSetNumber() {
        return setNumber;
    }

    public BigDecimal getWeightKg() {
        return weightKg;
    }

    public int getRepetitions() {
        return repetitions;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public Integer getDistanceMeters() {
        return distanceMeters;
    }

    public Short getPerceivedExertion() {
        return perceivedExertion;
    }

    public Integer getRestAfterSeconds() {
        return restAfterSeconds;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }
}
