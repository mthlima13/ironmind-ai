package com.ironmind.program.entity;

import com.ironmind.user.entity.TrainingGoal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Training program owned by a user.
 *
 * <p>The program is the container of the ordered days and exercises of a split. The days are read
 * through the repositories of the domain: the structure of a program is written and replaced as a
 * whole, so the document keeps only the owner and the content (SPEC.md section 10.4 and section 17).
 *
 * <p>Archiving is not deletion: {@code isArchived = true} keeps the program and its history
 * reachable, and it removes the program from the default listing.
 */
@Document(collection = "workout_programs")
public class WorkoutProgram {

    @Id
    private UUID id;

    /**
     * Owner of the program, always taken from the gateway header.
     */
    @Indexed
    private UUID userId;

    private String name;

    private String description;

    private TrainingGoal goal;

    private SplitType splitType;

    private boolean archived;

    private Instant createdAt;

    private Instant updatedAt;

    protected WorkoutProgram() {
    }

    /**
     * Creates a program owned by the given user.
     */
    public WorkoutProgram(UUID id, UUID userId, String name, String description, TrainingGoal goal,
            SplitType splitType) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.description = description;
        this.goal = goal;
        this.splitType = splitType;
        this.archived = false;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public TrainingGoal getGoal() {
        return goal;
    }

    public SplitType getSplitType() {
        return splitType;
    }

    public boolean isArchived() {
        return archived;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    /**
     * Tells whether the program belongs to the given user.
     *
     * <p>The owner always comes from the header injected by the gateway, so this check is the
     * boundary that keeps the data of one user away from the other (SPEC.md section 3.4).
     */
    public boolean isOwnedBy(UUID userId) {
        return userId != null && this.userId != null && userId.equals(this.userId);
    }

    /**
     * Replaces the content of the program, keeping the days and the exercises untouched.
     */
    public void update(String name, String description, TrainingGoal goal, SplitType splitType) {
        this.name = name;
        this.description = description;
        this.goal = goal;
        this.splitType = splitType;
        this.updatedAt = Instant.now();
    }

    /**
     * Archives the program: the record is kept, but it leaves the default listing.
     */
    public void archive() {
        this.archived = true;
        this.updatedAt = Instant.now();
    }
}
