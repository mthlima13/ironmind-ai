package com.ironmind.exercise.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Exercise of the catalog.
 *
 * <p>An exercise with {@code isSystem = true} and {@code createdByUserId = null} belongs to the
 * global catalog: it is readable by everyone and editable only by an administrator. An exercise
 * with {@code isSystem = false} belongs to a single user and is only visible to its owner.
 */
@Document(collection = "exercises")
public class Exercise {

    @Id
    private UUID id;

    private String name;

    private String description;

    private String primaryMuscleGroup;

    private List<String> secondaryMuscleGroups = new ArrayList<>();

    private String equipment;

    private String instructions;

    private MovementType movementType;

    private boolean system;

    /**
     * Owner of a personal exercise, {@code null} for the global catalog.
     */
    @Indexed
    private UUID createdByUserId;

    private Instant createdAt;

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
