package com.ironmind.user.dto;

import com.ironmind.user.entity.PreferredUnits;
import com.ironmind.user.entity.TrainingExperience;
import com.ironmind.user.entity.TrainingGoal;
import com.ironmind.user.entity.User;
import com.ironmind.user.entity.UserPreferences;
import com.ironmind.user.entity.UserRole;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Answer of the profile endpoints: the account, the preferences and the timezone.
 *
 * <p>The body is nested because this is the shape consumed by the mobile application
 * ({@code mobile/src/types/user.ts}).
 *
 * @param user        public information of the account
 * @param preferences preferences of the user
 * @param timezone    IANA timezone of the user
 */
public record UserProfileResponse(UserSummary user, Preferences preferences, String timezone) {

    /**
     * Public information of the account.
     *
     * @param id    identifier of the account
     * @param name  name of the user
     * @param email e-mail of the user
     * @param role  role of the account
     */
    public record UserSummary(UUID id, String name, String email, UserRole role) {
    }

    /**
     * Preferences of the user.
     *
     * @param preferredUnits     unit system preferred by the user
     * @param trainingExperience experience of the user
     * @param goal               goal of the training
     * @param availableEquipment equipment available to the user
     * @param trainingDays       days of training per week
     * @param privacySettings    visibility settings, always with the three flags resolved
     */
    public record Preferences(PreferredUnits preferredUnits, TrainingExperience trainingExperience, TrainingGoal goal,
            List<String> availableEquipment, Integer trainingDays, PrivacySettings privacySettings) {
    }

    /**
     * Maps the account and the preferences into the answer of the API.
     *
     * @param user             account of the owner
     * @param preferences      preferences of the owner
     * @param privacySettings  visibility settings already normalized by the service
     */
    public static UserProfileResponse from(User user, UserPreferences preferences, PrivacySettings privacySettings) {
        return new UserProfileResponse(
                new UserSummary(user.getId(), user.getName(), user.getEmail(), user.getRole()),
                new Preferences(
                        preferences.getPreferredUnits(),
                        preferences.getTrainingExperience(),
                        preferences.getGoal(),
                        sanitizedEquipment(preferences.getAvailableEquipment()),
                        preferences.getTrainingDays() == null ? null : preferences.getTrainingDays().intValue(),
                        privacySettings),
                user.getTimezone());
    }

    /**
     * Removes the malformed entries of the equipment list.
     *
     * <p>The column is free form, so a value written outside the API can hold an entry that is
     * not a usable equipment name.
     */
    private static List<String> sanitizedEquipment(List<String> equipment) {
        List<String> sanitized = new ArrayList<>();
        for (String item : equipment) {
            if (item != null && !item.isBlank()) {
                sanitized.add(item.trim());
            }
        }
        return List.copyOf(sanitized);
    }
}
