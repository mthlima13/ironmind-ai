package com.ironmind.program.entity;

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
 * Exercise of a program day, with the targets of the training.
 *
 * <p>The exercise always comes from the catalog: the API refuses an identifier that does not
 * exist, so a program never points to a movement that cannot be read
 * (SPEC.md section 10.6 and section 12.2).
 */
@Entity
@Table(name = "program_exercises")
public class ProgramExercise {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "program_day_id", nullable = false)
    private ProgramDay day;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "target_sets", nullable = false)
    private int targetSets;

    @Column(name = "target_reps_min", nullable = false)
    private int targetRepsMin;

    @Column(name = "target_reps_max", nullable = false)
    private int targetRepsMax;

    @Column(name = "rest_seconds")
    private Integer restSeconds;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    protected ProgramExercise() {
    }

    /**
     * Creates the entry of an exercise inside a day of a program.
     *
     * @param id           identifier of the entry
     * @param day          day the exercise belongs to
     * @param exercise     exercise of the catalog
     * @param position     position of the exercise inside the day, starting at one
     * @param targetSets   number of target sets
     * @param targetRepsMin smallest number of target repetitions
     * @param targetRepsMax biggest number of target repetitions
     * @param restSeconds  rest between the sets, in seconds
     * @param notes        observations of the user
     */
    public ProgramExercise(UUID id, ProgramDay day, Exercise exercise, int position, int targetSets,
            int targetRepsMin, int targetRepsMax, Integer restSeconds, String notes) {
        this.id = id;
        this.day = day;
        this.exercise = exercise;
        this.position = position;
        this.targetSets = targetSets;
        this.targetRepsMin = targetRepsMin;
        this.targetRepsMax = targetRepsMax;
        this.restSeconds = restSeconds;
        this.notes = notes;
    }

    public UUID getId() {
        return id;
    }

    public ProgramDay getDay() {
        return day;
    }

    public Exercise getExercise() {
        return exercise;
    }

    public int getPosition() {
        return position;
    }

    public int getTargetSets() {
        return targetSets;
    }

    public int getTargetRepsMin() {
        return targetRepsMin;
    }

    public int getTargetRepsMax() {
        return targetRepsMax;
    }

    public Integer getRestSeconds() {
        return restSeconds;
    }

    public String getNotes() {
        return notes;
    }
}
