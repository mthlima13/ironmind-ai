package com.ironmind.workout.entity;

import com.ironmind.exercise.entity.Exercise;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Exercise performed inside a session, with the sets registered for it.
 */
@Entity
@Table(name = "session_exercises")
public class SessionExercise {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private WorkoutSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    /**
     * Plan of the exercise, when the session started from a program day.
     *
     * <p>The plan is a snapshot: it does not change when the program is edited later (SPEC 7.6).
     * It is {@code null} for a free session, where the exercise was added without a plan.
     */
    @Column(name = "target_sets")
    private Integer targetSets;

    @Column(name = "target_reps_min")
    private Integer targetRepsMin;

    @Column(name = "target_reps_max")
    private Integer targetRepsMax;

    @Column(name = "rest_seconds")
    private Integer restSeconds;

    protected SessionExercise() {
    }

    public SessionExercise(UUID id, WorkoutSession session, Exercise exercise, int position) {
        this(id, session, exercise, position, null);
    }

    /**
     * Creates the exercise performed inside a session, with the observations of the user.
     *
     * @param id       identifier of the entry
     * @param session  session the exercise belongs to
     * @param exercise exercise of the catalog
     * @param position position of the exercise inside the session, starting at one
     * @param notes    observations of the user
     */
    public SessionExercise(UUID id, WorkoutSession session, Exercise exercise, int position, String notes) {
        this.id = id;
        this.session = session;
        this.exercise = exercise;
        this.position = position;
        this.notes = notes;
    }

    /**
     * Creates the exercise performed inside a session, with the plan of a program day.
     *
     * @param id            identifier of the entry
     * @param session       session the exercise belongs to
     * @param exercise      exercise of the catalog
     * @param position      position of the exercise inside the session, starting at one
     * @param notes         observations of the user
     * @param targetSets    number of sets planned
     * @param targetRepsMin lower bound of the planned repetitions
     * @param targetRepsMax upper bound of the planned repetitions
     * @param restSeconds   rest between the sets, in seconds
     */
    public SessionExercise(UUID id, WorkoutSession session, Exercise exercise, int position, String notes,
            Integer targetSets, Integer targetRepsMin, Integer targetRepsMax, Integer restSeconds) {
        this(id, session, exercise, position, notes);
        this.targetSets = targetSets;
        this.targetRepsMin = targetRepsMin;
        this.targetRepsMax = targetRepsMax;
        this.restSeconds = restSeconds;
    }

    public UUID getId() {
        return id;
    }

    public WorkoutSession getSession() {
        return session;
    }

    public Exercise getExercise() {
        return exercise;
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
