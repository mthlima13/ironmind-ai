package com.ironmind.workout.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Set registered for an exercise of a session.
 *
 * <p>The load is stored in kilograms, the canonical unit of the product. It is {@code null} for
 * bodyweight movements.
 *
 * <p>The document keeps the owner and the identifiers of the session and of the exercise of the
 * catalog, so the queries of the history and of the records never have to walk a chain of
 * references.
 */
@Document(collection = "exercise_sets")
@CompoundIndex(name = "user_exercise_completed", def = "{'userId': 1, 'exerciseId': 1, 'completedAt': 1}")
@CompoundIndex(name = "session_set", def = "{'sessionId': 1, 'sessionExerciseId': 1, 'setNumber': 1}")
public class ExerciseSet {

    @Id
    private UUID id;

    /**
     * Owner of the set, always taken from the gateway header.
     */
    private UUID userId;

    @Indexed
    private UUID sessionId;

    @Indexed
    private UUID sessionExerciseId;

    @Indexed
    private UUID exerciseId;

    private int setNumber;

    private BigDecimal weightKg;

    private int repetitions;

    private Integer durationSeconds;

    private Integer distanceMeters;

    private Short perceivedExertion;

    private Integer restAfterSeconds;

    private Instant completedAt;

    private Instant createdAt;

    /**
     * Durable idempotency key of the registration, unique across the collection.
     *
     * <p>The field is only written when the client sent a key: the index is sparse, and a document
     * with the field present but {@code null} would still be indexed and collide with every other
     * set registered without a key. {@link Field.Write#NON_NULL} keeps the field out of the
     * document in that case.
     */
    @Indexed(unique = true, sparse = true)
    @Field(write = Field.Write.NON_NULL)
    private String idempotencyKey;

    protected ExerciseSet() {
    }

    public ExerciseSet(UUID id, UUID userId, UUID sessionId, UUID sessionExerciseId, UUID exerciseId,
            int setNumber, BigDecimal weightKg, int repetitions) {
        this(id, userId, sessionId, sessionExerciseId, exerciseId, setNumber, weightKg, repetitions,
                null, null, null, null, null);
    }

    /**
     * Creates the set with every value the API accepts.
     *
     * @param id                identifier of the set
     * @param userId            owner of the session the set belongs to
     * @param sessionId         identifier of the session
     * @param sessionExerciseId identifier of the exercise of the session
     * @param exerciseId        identifier of the exercise of the catalog
     * @param setNumber         position of the set inside the exercise, starting at one
     * @param weightKg          load in kilograms, {@code null} for bodyweight movements
     * @param repetitions       number of repetitions
     * @param durationSeconds   duration of the set, for isometric and cardio movements
     * @param distanceMeters    distance of the set, for cardio movements
     * @param perceivedExertion rate of perceived exertion, from 1 to 10
     * @param restAfterSeconds  rest taken after the set
     * @param idempotencyKey    durable idempotency key of the registration
     */
    public ExerciseSet(UUID id, UUID userId, UUID sessionId, UUID sessionExerciseId, UUID exerciseId,
            int setNumber, BigDecimal weightKg, int repetitions, Integer durationSeconds,
            Integer distanceMeters, Short perceivedExertion, Integer restAfterSeconds,
            String idempotencyKey) {
        this.id = id;
        this.userId = userId;
        this.sessionId = sessionId;
        this.sessionExerciseId = sessionExerciseId;
        this.exerciseId = exerciseId;
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

    public UUID getUserId() {
        return userId;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public UUID getSessionExerciseId() {
        return sessionExerciseId;
    }

    public UUID getExerciseId() {
        return exerciseId;
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
