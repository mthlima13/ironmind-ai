package com.ironmind.program.entity;

import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Exercise of a program day, with the targets of the training.
 *
 * <p>The exercise always comes from the catalog: the API refuses an identifier that does not
 * exist, so a program never points to a movement that cannot be read
 * (SPEC.md section 10.6 and section 12.2).
 *
 * <p>The entry keeps the identifier of the exercise, not a copy of the document: the catalog
 * stays the single source of truth of the movement, in the same way the relational model did.
 */
@Document(collection = "program_exercises")
@CompoundIndex(name = "program_day_position", def = "{'dayId': 1, 'position': 1}")
public class ProgramExercise {

    @Id
    private UUID id;

    @Indexed
    private UUID programId;

    @Indexed
    private UUID dayId;

    @Indexed
    private UUID exerciseId;

    private int position;

    private int targetSets;

    private int targetRepsMin;

    private int targetRepsMax;

    private Integer restSeconds;

    private String notes;

    protected ProgramExercise() {
    }

    /**
     * Creates the entry of an exercise inside a day of a program.
     *
     * @param id           identifier of the entry
     * @param programId    identifier of the program the day belongs to
     * @param dayId        identifier of the day the exercise belongs to
     * @param exerciseId   identifier of the exercise of the catalog
     * @param position     position of the exercise inside the day, starting at one
     * @param targetSets   number of target sets
     * @param targetRepsMin smallest number of target repetitions
     * @param targetRepsMax biggest number of target repetitions
     * @param restSeconds  rest between the sets, in seconds
     * @param notes        observations of the user
     */
    public ProgramExercise(UUID id, UUID programId, UUID dayId, UUID exerciseId, int position,
            int targetSets, int targetRepsMin, int targetRepsMax, Integer restSeconds, String notes) {
        this.id = id;
        this.programId = programId;
        this.dayId = dayId;
        this.exerciseId = exerciseId;
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

    public UUID getProgramId() {
        return programId;
    }

    public UUID getDayId() {
        return dayId;
    }

    public UUID getExerciseId() {
        return exerciseId;
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
