package com.ironmind.user.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.user.dto.DeleteAccountRequest;
import com.ironmind.user.dto.PrivacySettings;
import com.ironmind.user.dto.UpdatePreferencesRequest;
import com.ironmind.user.dto.UpdateProfileRequest;
import com.ironmind.user.dto.UserProfileResponse;
import com.ironmind.user.entity.PreferredUnits;
import com.ironmind.user.entity.TrainingExperience;
import com.ironmind.user.entity.TrainingGoal;
import com.ironmind.user.entity.User;
import com.ironmind.user.entity.UserPreferences;
import com.ironmind.user.repository.UserPreferencesRepository;
import com.ironmind.user.repository.UserRepository;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rules of the profile and of the preferences of the user.
 *
 * <p>The service owns the merge of the partial update: an omitted field keeps the current value
 * and the preferences are merged field by field. It also owns the normalization of the visibility
 * settings, because the column is free form and can hold a value that is not a boolean.
 *
 * <p>The owner always comes from the access token: the identifier of the user is never read from
 * the body of the request (SPEC.md section 11.7).
 */
@Service
@Transactional(readOnly = true)
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    /**
     * Days of training of the default preferences.
     */
    private static final short DEFAULT_TRAINING_DAYS = 3;

    /**
     * Smallest accepted name.
     */
    private static final int MIN_NAME_LENGTH = 2;

    /**
     * Biggest accepted name.
     */
    private static final int MAX_NAME_LENGTH = 120;

    /**
     * Biggest accepted number of items of the equipment list.
     */
    private static final int MAX_EQUIPMENT_ITEMS = 30;

    /**
     * Biggest accepted length of an item of the equipment list.
     */
    private static final int MAX_EQUIPMENT_LENGTH = 60;

    /**
     * Smallest accepted number of training days.
     */
    private static final int MIN_TRAINING_DAYS = 1;

    /**
     * Biggest accepted number of training days.
     */
    private static final int MAX_TRAINING_DAYS = 7;

    private final UserRepository userRepository;
    private final UserPreferencesRepository userPreferencesRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, UserPreferencesRepository userPreferencesRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.userPreferencesRepository = userPreferencesRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Returns the profile and the preferences of the authenticated user.
     *
     * @param userId identifier of the authenticated user, always taken from the access token
     * @throws ResourceNotFoundException when the account does not exist anymore
     */
    public UserProfileResponse getProfile(UUID userId) {
        User user = requireUser(userId);
        UserPreferences preferences = userPreferencesRepository.findByUserId(userId).orElse(null);
        return toResponse(user, preferences);
    }

    /**
     * Updates the profile and the preferences of the authenticated user.
     *
     * <p>The update is partial and merged: an omitted field keeps the current value and the
     * preferences are merged field by field. The owner always comes from the access token, so a
     * request can never change the data of another user.
     *
     * @param userId  identifier of the authenticated user, always taken from the access token
     * @param request payload of the update
     * @throws ResourceNotFoundException when the account does not exist anymore
     */
    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = requireUser(userId);
        applyProfile(user, request);

        UserPreferences preferences = loadPreferences(userId);
        applyPreferences(preferences, request == null ? null : request.preferences());

        userRepository.save(user);
        userPreferencesRepository.save(preferences);

        return toResponse(user, preferences);
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("usuário", userId));
    }

    /**
     * Erases the account of the authenticated user and every record that belongs to it.
     *
     * <p>The deletion is a hard delete: the {@code users} row is removed and the foreign keys
     * cascade to the preferences, the refresh tokens, the recovery tokens, the programs, the
     * sessions, the sets, the personal records, the restrictions and the AI recommendations
     * (SPEC.md section 14.3). Nothing is kept as an archive, so the e-mail becomes available for a
     * new account.
     *
     * <p>The password is required as a second proof of ownership. A wrong password rejects the
     * operation with a field error and keeps the account untouched; the owner of the token is the
     * only one who can ask for the deletion.
     *
     * @param userId  identifier of the authenticated user, always taken from the access token
     * @param request payload with the current password
     * @throws ResourceNotFoundException when the account does not exist anymore
     * @throws FieldValidationException  when the informed password does not match the stored hash
     */
    @Transactional
    public void deleteAccount(UUID userId, DeleteAccountRequest request) {
        User user = requireUser(userId);
        if (request == null || request.password() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new FieldValidationException("password", "Senha incorreta.");
        }

        userRepository.delete(user);
        // Only the identifier is logged: the e-mail, the name and the password never reach the log.
        log.info("Account deleted: {}", userId);
    }

    /**
     * Loads the preferences of the user, creating the default ones when they are missing.
     */
    private UserPreferences loadPreferences(UUID userId) {
        return userPreferencesRepository.findByUserId(userId)
                .orElseGet(() -> new UserPreferences(UUID.randomUUID(), userId, PreferredUnits.KG,
                        TrainingExperience.BEGINNER, TrainingGoal.GENERAL, List.of(), DEFAULT_TRAINING_DAYS, Map.of()));
    }

    private void applyProfile(User user, UpdateProfileRequest request) {
        if (request == null) {
            return;
        }
        if (request.name() != null) {
            user.setName(validatedName(request.name()));
        }
        if (request.timezone() != null) {
            user.setTimezone(validatedTimezone(request.timezone()));
        }
    }

    private void applyPreferences(UserPreferences preferences, UpdatePreferencesRequest request) {
        if (request == null) {
            return;
        }

        PreferredUnits units = request.preferredUnits() == null
                ? preferences.getPreferredUnits()
                : request.preferredUnits();
        TrainingExperience experience = request.trainingExperience() == null
                ? preferences.getTrainingExperience()
                : request.trainingExperience();
        TrainingGoal goal = request.goal() == null ? preferences.getGoal() : request.goal();

        JsonNode equipmentNode = request.availableEquipment();
        List<String> equipment = equipmentNode == null || equipmentNode.isNull()
                ? preferences.getAvailableEquipment()
                : readEquipment(equipmentNode);

        Short trainingDays = request.trainingDays() == null
                ? preferences.getTrainingDays()
                : validatedTrainingDays(request.trainingDays());

        Map<String, Object> privacySettings = mergePrivacySettings(preferences.getPrivacySettings(),
                request.privacySettings());

        preferences.update(units, experience, goal, equipment, trainingDays, privacySettings);
    }

    /**
     * Reads the list of available equipment informed in the request.
     *
     * @throws FieldValidationException when the value is not a list of texts
     */
    private static List<String> readEquipment(JsonNode node) {
        if (!node.isArray()) {
            throw new FieldValidationException("preferences.availableEquipment",
                    "A lista de equipamentos disponíveis deve ser uma lista de textos.");
        }

        List<String> equipment = new ArrayList<>();
        for (JsonNode item : node) {
            if (!item.isTextual()) {
                throw new FieldValidationException("preferences.availableEquipment",
                        "A lista de equipamentos disponíveis deve ser uma lista de textos.");
            }
            String value = item.asText().trim();
            if (value.isEmpty()) {
                continue;
            }
            if (value.length() > MAX_EQUIPMENT_LENGTH) {
                throw new FieldValidationException("preferences.availableEquipment",
                        "Cada equipamento disponível deve ter no máximo 60 caracteres.");
            }
            equipment.add(value);
        }

        if (equipment.size() > MAX_EQUIPMENT_ITEMS) {
            throw new FieldValidationException("preferences.availableEquipment",
                    "É possível informar no máximo 30 equipamentos disponíveis.");
        }
        return equipment;
    }

    /**
     * Merges the visibility settings informed in the request with the stored ones.
     */
    private static Map<String, Object> mergePrivacySettings(Map<String, Object> stored, PrivacySettings requested) {
        PrivacySettings current = sanitizePrivacySettings(stored);
        if (requested == null) {
            return toMap(current);
        }
        return toMap(PrivacySettings.of(
                requested.publicProfile() == null ? current.publicProfile() : requested.publicProfile(),
                requested.showRecords() == null ? current.showRecords() : requested.showRecords(),
                requested.allowSharing() == null ? current.allowSharing() : requested.allowSharing()));
    }

    /**
     * Normalizes the visibility settings stored as {@code jsonb}.
     *
     * <p>The column is free form, so a value written outside the API can hold a type that is not
     * a boolean: the malformed value is replaced by the default instead of breaking the answer.
     */
    private static PrivacySettings sanitizePrivacySettings(Map<String, Object> stored) {
        if (stored == null || stored.isEmpty()) {
            return PrivacySettings.defaults();
        }
        return PrivacySettings.of(
                booleanOrDefault(stored.get("publicProfile"), false),
                booleanOrDefault(stored.get("showRecords"), true),
                booleanOrDefault(stored.get("allowSharing"), false));
    }

    private static boolean booleanOrDefault(Object value, boolean fallback) {
        return value instanceof Boolean flag ? flag : fallback;
    }

    private static Map<String, Object> toMap(PrivacySettings settings) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("publicProfile", settings.publicProfile());
        values.put("showRecords", settings.showRecords());
        values.put("allowSharing", settings.allowSharing());
        return values;
    }

    /**
     * Validates the name of the user, after removing the spaces of the ends.
     */
    private static String validatedName(String name) {
        String trimmed = name.trim();
        if (trimmed.length() < MIN_NAME_LENGTH || trimmed.length() > MAX_NAME_LENGTH) {
            throw new FieldValidationException("name", "O nome deve ter entre 2 e 120 caracteres.");
        }
        return trimmed;
    }

    /**
     * Validates the timezone of the user, which must be an IANA identifier.
     */
    private static String validatedTimezone(String timezone) {
        String trimmed = timezone.trim();
        try {
            ZoneId.of(trimmed);
        } catch (DateTimeException ex) {
            throw new FieldValidationException("timezone",
                    "Informe um fuso horário IANA válido, por exemplo America/Sao_Paulo.");
        }
        return trimmed;
    }

    /**
     * Validates the number of training days, which the database also restricts to 1..7.
     */
    private static Short validatedTrainingDays(Integer trainingDays) {
        if (trainingDays == null || trainingDays < MIN_TRAINING_DAYS || trainingDays > MAX_TRAINING_DAYS) {
            throw new FieldValidationException("preferences.trainingDays",
                    "O número de dias de treino deve estar entre 1 e 7.");
        }
        return trainingDays.shortValue();
    }

    private UserProfileResponse toResponse(User user, UserPreferences preferences) {
        UserPreferences resolved = preferences == null ? defaultPreferences(user.getId()) : preferences;
        PrivacySettings privacySettings = sanitizePrivacySettings(resolved.getPrivacySettings());
        return UserProfileResponse.from(user, resolved, privacySettings);
    }

    /**
     * Preferences used when the account has none, without writing them.
     */
    private static UserPreferences defaultPreferences(UUID userId) {
        return new UserPreferences(UUID.randomUUID(), userId, PreferredUnits.KG, TrainingExperience.BEGINNER,
                TrainingGoal.GENERAL, List.of(), DEFAULT_TRAINING_DAYS, Map.of());
    }
}
