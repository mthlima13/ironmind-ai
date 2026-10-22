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

    protected SessionExercise() {
    }

    public SessionExercise(UUID id, WorkoutSession session, Exercise exercise, int position) {
        this.id = id;
        this.session = session;
        this.exercise = exercise;
        this.position = position;
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
}
