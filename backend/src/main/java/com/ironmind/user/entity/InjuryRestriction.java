package com.ironmind.user.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Injury restriction informed by the user (SPEC.md section 10.11).
 *
 * <p>This is sensitive health data. Only the owner can access it.
 */
@Document(collection = "injury_restrictions")
public class InjuryRestriction {

    @Id
    private UUID id;

    /**
     * Owner of the restriction, always taken from the gateway header.
     */
    @Indexed
    private UUID userId;

    private String bodyRegion;

    private String description;

    private boolean active = true;

    private List<UUID> exerciseIds = new ArrayList<>();

    private Instant createdAt;

    private Instant updatedAt;

    protected InjuryRestriction() {
    }

    public InjuryRestriction(UUID id, UUID userId, String bodyRegion, String description,
            boolean active, List<UUID> exerciseIds) {
        this.id = id;
        this.userId = userId;
        this.bodyRegion = bodyRegion == null ? "" : bodyRegion.trim();
        this.description = description == null ? "" : description.trim();
        this.active = active;
        this.exerciseIds = exerciseIds == null ? new ArrayList<>() : new ArrayList<>(exerciseIds);
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getBodyRegion() {
        return bodyRegion;
    }

    public String getDescription() {
        return description;
    }

    public boolean isActive() {
        return active;
    }

    public List<UUID> getExerciseIds() {
        return List.copyOf(exerciseIds);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    /**
     * Replaces the content of the restriction.
     */
    public void update(String bodyRegion, String description, boolean active, List<UUID> exerciseIds) {
        this.bodyRegion = bodyRegion == null ? "" : bodyRegion.trim();
        this.description = description == null ? "" : description.trim();
        this.active = active;
        this.exerciseIds = exerciseIds == null ? new ArrayList<>() : new ArrayList<>(exerciseIds);
        this.updatedAt = Instant.now();
    }
}
