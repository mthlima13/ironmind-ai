package com.ironmind.user.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Injury restriction informed by the user (SPEC.md section 10.11).
 *
 * <p>This is sensitive health data. Only the owner can access it.
 */
@Entity
@Table(name = "injury_restrictions")
public class InjuryRestriction {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "body_region", nullable = false, length = 80)
    private String bodyRegion;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "restriction_exercises", joinColumns = @JoinColumn(name = "restriction_id"))
    @Column(name = "exercise_id")
    private List<UUID> exerciseIds = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected InjuryRestriction() {
    }

    public InjuryRestriction(UUID id, User user, String bodyRegion, String description,
            boolean active, List<UUID> exerciseIds) {
        this.id = id;
        this.user = user;
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

    public User getUser() {
        return user;
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
