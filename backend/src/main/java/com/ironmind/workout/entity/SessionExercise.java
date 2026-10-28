package com.ironmind.workout.entity;

import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Exercise performed inside a session, with the sets registered for it.
 *
 * <p>The entry keeps the identifier of the exercise of the catalog, so the catalog stays the
 * single source of truth of the movement. The plan of the program day is a snapshot: it does not
 * change when the program is edited later (SPEC.md section 7.6).
 */
@Document(collection = "session_exercises")
@CompoundIndex(name = "session_position", def = "{'sessionId': 1, 'position': 1}")
public class SessionExercise {

    @Id
    private UUID id;

    @Indexed
    private UUID sessionId;

    @Indexed
    private UUID exerciseId;

    private int position;

    private String notes;

    private Integer targetSets;

    private Integer targetRepsMin;

    private Integer targetRepsMax;

    private Integer restSeconds;

    protected SessionExercise() {
    }

    public SessionExercise(UUID id, UUID sessionId, UUID exerciseId, int position) {
        this(id, sessionId, exerciseId, position, null);
    }

    /**
     * Creates the exercise performed inside a session, with the observations of the user.
     *
     * @param id         identifier of the entry
     * @param sessionId  identifier of the session the exercise belongs to
     * @param exerciseId identifier of the exercise of the catalog
     * @param position   position of the exercise inside the session, starting at one
     * @param notes      observations of the user
     */
    public SessionExercise(UUID id, UUID sessionId, UUID exerciseId, int position, String notes) {
        this.id = id;
        this.sessionId = sessionId;
        this.exerciseId = exerciseId;
        this.position = position;
        this.notes = notes;
    }

    /**
     * Creates the exercise performed inside a session, with the plan of a program day.
     *
     * @param id            identifier of the entry
     * @param sessionId     identifier of the session the exercise belongs to
     * @param exerciseId    identifier of the exercise of the catalog
     * @param position      position of the exercise inside the session, starting at one
     * @param notes         observations of the user
     * @param targetSets    number of sets planned
     * @param targetRepsMin lower bound of the planned repetitions
     * @param targetRepsMax upper bound of the planned repetitions
     * @param restSeconds   rest between the sets, in seconds
     */
    public SessionExercise(UUID id, UUID sessionId, UUID exerciseId, int position, String notes,
            Integer targetSets, Integer targetRepsMin, Integer targetRepsMax, Integer restSeconds) {
        this(id, sessionId, exerciseId, position, notes);
        this.targetSets = targetSets;
        this.targetRepsMin = targetRepsMin;
        this.targetRepsMax = targetRepsMax;
        this.restSeconds = restSeconds;
    }

    public UUID getId() {
        return id;
    }

    public UUID getSessionId() {
        return sessionId;
    }

    public UUID getExerciseId() {
        return exerciseId;
    }

    public int getPosition() {
        return position;
    }

    public String getNotes() {
        return notes;
    }

    public Integer getTargetSets() {
        return targetSets;
    }

    public Integer getTargetRepsMin() {
        return targetRepsMin;
    }

    public Integer getTargetRepsMax() {
        return targetRepsMax;
    }

    public Integer getRestSeconds() {
        return restSeconds;
    }
}
