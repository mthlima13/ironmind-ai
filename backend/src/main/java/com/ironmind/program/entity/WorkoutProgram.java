package com.ironmind.program.entity;

import com.ironmind.user.entity.TrainingGoal;
import com.ironmind.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Training program owned by a user.
 *
 * <p>The program is the container of the ordered days and exercises of a split. The days are read
 * through the repositories of the domain: the structure of a program is written and replaced as a
 * whole, so the entity keeps only the owner and the content (SPEC.md section 10.4 and section 17).
 *
 * <p>Archiving is not deletion: {@code isArchived = true} keeps the program and its history
 * reachable, and it removes the program from the default listing.
 */
@Entity
@Table(name = "workout_programs")
public class WorkoutProgram {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "goal", nullable = false)
    private TrainingGoal goal;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "split_type", nullable = false)
    private SplitType splitType;

    @Column(name = "is_archived", nullable = false)
    private boolean archived;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected WorkoutProgram() {
    }

    /**
     * Creates a program owned by the given user.
     */
    public WorkoutProgram(UUID id, User user, String name, String description, TrainingGoal goal,
            SplitType splitType) {
        this.id = id;
        this.user = user;
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

    public User getUser() {
        return user;
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
     * <p>The owner always comes from the access token, so this check is the boundary that keeps
     * the data of one user away from the other (SPEC.md section 3.4).
     */
    public boolean isOwnedBy(UUID userId) {
        return userId != null && user != null && userId.equals(user.getId());
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
