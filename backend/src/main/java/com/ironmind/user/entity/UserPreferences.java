package com.ironmind.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Preferences of the user.
 *
 * <p>The preferences are the main input of the context of the AI service (SPEC.md section 10.2),
 * so they are created together with the account, in the same transaction.
 */
@Entity
@Table(name = "user_preferences")
public class UserPreferences {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_units", nullable = false)
    private PreferredUnits preferredUnits;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "training_experience", nullable = false)
    private TrainingExperience trainingExperience;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Enumerated(EnumType.STRING)
    @Column(name = "goal", nullable = false)
    private TrainingGoal goal;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "available_equipment", nullable = false)
    private List<String> availableEquipment;

    @Column(name = "training_days", nullable = false)
    private Short trainingDays;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "privacy_settings", nullable = false)
    private Map<String, Object> privacySettings;

    protected UserPreferences() {
    }

    /**
     * Creates the preferences of a user.
     */
    public UserPreferences(UUID id, UUID userId, PreferredUnits preferredUnits,
            TrainingExperience trainingExperience, TrainingGoal goal, List<String> availableEquipment,
            Short trainingDays, Map<String, Object> privacySettings) {
        this.id = id;
        this.userId = userId;
        this.preferredUnits = preferredUnits;
        this.trainingExperience = trainingExperience;
        this.goal = goal;
        this.availableEquipment = availableEquipment == null ? new ArrayList<>() : new ArrayList<>(availableEquipment);
        this.trainingDays = trainingDays;
        this.privacySettings = privacySettings == null ? new LinkedHashMap<>() : new LinkedHashMap<>(privacySettings);
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public PreferredUnits getPreferredUnits() {
        return preferredUnits;
    }

    public TrainingExperience getTrainingExperience() {
        return trainingExperience;
    }

    public TrainingGoal getGoal() {
        return goal;
    }

    public List<String> getAvailableEquipment() {
        return List.copyOf(availableEquipment);
    }

    public Short getTrainingDays() {
        return trainingDays;
    }

    public Map<String, Object> getPrivacySettings() {
        return Map.copyOf(privacySettings);
    }
}
