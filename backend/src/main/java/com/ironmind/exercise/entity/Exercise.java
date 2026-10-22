package com.ironmind.exercise.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Exercise of the catalog.
 *
 * <p>An exercise with {@code isSystem = true} and {@code createdByUserId = null} belongs to the
 * global catalog: it is readable by everyone and editable only by an administrator. An exercise
 * with {@code isSystem = false} belongs to a single user and is only visible to its owner.
 */
@Entity
@Table(name = "exercises")
public class Exercise {

    @Id
    private UUID id;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "primary_muscle_group", nullable = false, length = 60)
    private String primaryMuscleGroup;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "secondary_muscle_groups", nullable = false)
    private List<String> secondaryMuscleGroups = new ArrayList<>();

    @Column(name = "equipment", nullable = false, length = 60)
    private String equipment;

    @Column(name = "instructions", columnDefinition = "text")
    private String instructions;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false)
    private MovementType movementType;

    @Column(name = "is_system", nullable = false)
    private boolean system;

    @Column(name = "created_by_user_id")
    private UUID createdByUserId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Exercise() {
    }

    /**
     * Creates an exercise of the global catalog.
     */
    public Exercise(UUID id, String name, String description, String primaryMuscleGroup,
            List<String> secondaryMuscleGroups, String equipment, String instructions,
            MovementType movementType) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.primaryMuscleGroup = primaryMuscleGroup;
        this.secondaryMuscleGroups = secondaryMuscleGroups == null ? new ArrayList<>() : new ArrayList<>(secondaryMuscleGroups);
        this.equipment = equipment;
        this.instructions = instructions;
        this.movementType = movementType;
        this.system = true;
        this.createdByUserId = null;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    /**
     * Creates a personal exercise owned by the given user.
     */
    public Exercise(UUID id, String name, String description, String primaryMuscleGroup,
            List<String> secondaryMuscleGroups, String equipment, String instructions,
            MovementType movementType, UUID createdByUserId) {
        this(id, name, description, primaryMuscleGroup, secondaryMuscleGroups, equipment, instructions, movementType);
        this.system = false;
        this.createdByUserId = createdByUserId;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getPrimaryMuscleGroup() {
        return primaryMuscleGroup;
    }

    public List<String> getSecondaryMuscleGroups() {
        return List.copyOf(secondaryMuscleGroups);
    }

    public String getEquipment() {
        return equipment;
    }

    public String getInstructions() {
        return instructions;
    }

    public MovementType getMovementType() {
        return movementType;
    }

    public boolean isSystem() {
        return system;
    }

    public UUID getCreatedByUserId() {
        return createdByUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    /**
     * Tells whether the exercise is visible to the given user.
     *
     * <p>Global exercises are visible to everyone; personal exercises are visible only to their
     * owner.
     */
    public boolean isVisibleTo(UUID userId) {
        return system || (createdByUserId != null && createdByUserId.equals(userId));
    }

    /**
     * Tells whether the exercise can be edited by the given user.
     */
    public boolean isEditableBy(UUID userId) {
        return !system && createdByUserId != null && createdByUserId.equals(userId);
    }

    public void update(String name, String description, String primaryMuscleGroup, List<String> secondaryMuscleGroups,
            String equipment, String instructions, MovementType movementType) {
        this.name = name;
        this.description = description;
        this.primaryMuscleGroup = primaryMuscleGroup;
        this.secondaryMuscleGroups = secondaryMuscleGroups == null ? new ArrayList<>() : new ArrayList<>(secondaryMuscleGroups);
        this.equipment = equipment;
        this.instructions = instructions;
        this.movementType = movementType;
        this.updatedAt = Instant.now();
    }
}
