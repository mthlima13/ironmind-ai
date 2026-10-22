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
        this(id, sessionExercise, setNumber, weightKg, repetitions, null, null, null, null, null);
    }

    /**
     * Creates the set with every value the API accepts.
     *
     * @param id                identifier of the set
     * @param sessionExercise   exercise of the session the set belongs to
     * @param setNumber         position of the set inside the exercise, starting at one
     * @param weightKg          load in kilograms, {@code null} for bodyweight movements
     * @param repetitions       number of repetitions
     * @param durationSeconds   duration of the set, for isometric and cardio movements
     * @param distanceMeters    distance of the set, for cardio movements
     * @param perceivedExertion rate of perceived exertion, from 1 to 10
     * @param restAfterSeconds  rest taken after the set
     * @param idempotencyKey    durable idempotency key of the registration
     */
    public ExerciseSet(UUID id, SessionExercise sessionExercise, int setNumber, BigDecimal weightKg, int repetitions,
            Integer durationSeconds, Integer distanceMeters, Short perceivedExertion, Integer restAfterSeconds,
            String idempotencyKey) {
        this.id = id;
        this.sessionExercise = sessionExercise;
        this.setNumber = setNumber;
        this.weightKg = weightKg;
        this.repetitions = repetitions;
        this.durationSeconds = durationSeconds;
        this.distanceMeters = distanceMeters;
        this.perceivedExertion = perceivedExertion;
        this.restAfterSeconds = restAfterSeconds;
        this.idempotencyKey = idempotencyKey;
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

    /**
     * Corrects the values of the set.
     *
     * <p>The identifier and the number of the set never change: a correction keeps the link with
     * the history (SPEC.md section 7.8).
     *
     * @param weightKg          load in kilograms, {@code null} for bodyweight movements
     * @param repetitions       number of repetitions
     * @param durationSeconds   duration of the set, for isometric and cardio movements
     * @param distanceMeters    distance of the set, for cardio movements
     * @param perceivedExertion rate of perceived exertion, from 1 to 10
     * @param restAfterSeconds  rest taken after the set
     */
    public void update(BigDecimal weightKg, int repetitions, Integer durationSeconds, Integer distanceMeters,
            Short perceivedExertion, Integer restAfterSeconds) {
        this.weightKg = weightKg;
        this.repetitions = repetitions;
        this.durationSeconds = durationSeconds;
        this.distanceMeters = distanceMeters;
        this.perceivedExertion = perceivedExertion;
        this.restAfterSeconds = restAfterSeconds;
    }
}
