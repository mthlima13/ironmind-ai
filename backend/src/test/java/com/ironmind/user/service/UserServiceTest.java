package com.ironmind.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.TextNode;
import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.user.dto.PrivacySettings;
import com.ironmind.user.dto.UpdatePreferencesRequest;
import com.ironmind.user.dto.UpdateProfileRequest;
import com.ironmind.user.dto.UserProfileResponse;
import com.ironmind.user.entity.PreferredUnits;
import com.ironmind.user.entity.TrainingExperience;
import com.ironmind.user.entity.TrainingGoal;
import com.ironmind.user.entity.User;
import com.ironmind.user.entity.UserPreferences;
import com.ironmind.user.entity.UserRole;
import com.ironmind.user.repository.UserPreferencesRepository;
import com.ironmind.user.repository.UserRepository;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final String PASSWORD_HASH = "hash";

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserPreferencesRepository userPreferencesRepository;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("merges the preferences field by field")
    void mergesThePreferencesFieldByField() {
        stubUserAndPreferences(preferences(
                PreferredUnits.KG,
                TrainingExperience.BEGINNER,
                TrainingGoal.GENERAL,
                List.of("Barra"),
                (short) 3,
                Map.of()));

        UserProfileResponse response = userService.updateProfile(USER_ID, new UpdateProfileRequest(null, null,
                new UpdatePreferencesRequest(null, null, TrainingGoal.HYPERTROPHY, null, null, null)));

        assertThat(response.preferences().goal()).isEqualTo(TrainingGoal.HYPERTROPHY);
        assertThat(response.preferences().preferredUnits()).isEqualTo(PreferredUnits.KG);
        assertThat(response.preferences().trainingExperience()).isEqualTo(TrainingExperience.BEGINNER);
        assertThat(response.preferences().availableEquipment()).containsExactly("Barra");
        assertThat(response.preferences().trainingDays()).isEqualTo(3);
    }

    @Test
    @DisplayName("keeps the value of the omitted fields")
    void keepsTheValueOfTheOmittedFields() {
        stubUserAndPreferences(preferences(
                PreferredUnits.LB,
                TrainingExperience.ADVANCED,
                TrainingGoal.STRENGTH,
                List.of("Barra", "Halteres"),
                (short) 5,
                Map.of("publicProfile", true, "showRecords", false, "allowSharing", true)));

        UserProfileResponse response = userService.updateProfile(USER_ID,
                new UpdateProfileRequest(null, null, new UpdatePreferencesRequest(null, null, null, null, null, null)));

        assertThat(response.user().name()).isEqualTo("Ana Souza");
        assertThat(response.timezone()).isEqualTo("America/Sao_Paulo");
        assertThat(response.preferences().preferredUnits()).isEqualTo(PreferredUnits.LB);
        assertThat(response.preferences().trainingExperience()).isEqualTo(TrainingExperience.ADVANCED);
        assertThat(response.preferences().goal()).isEqualTo(TrainingGoal.STRENGTH);
        assertThat(response.preferences().availableEquipment()).containsExactly("Barra", "Halteres");
        assertThat(response.preferences().trainingDays()).isEqualTo(5);
        assertThat(response.preferences().privacySettings().publicProfile()).isTrue();
        assertThat(response.preferences().privacySettings().showRecords()).isFalse();
        assertThat(response.preferences().privacySettings().allowSharing()).isTrue();
    }

    @Test
    @DisplayName("merges the privacy settings field by field")
    void mergesThePrivacySettingsFieldByField() {
        stubUserAndPreferences(preferences(
                PreferredUnits.KG,
                TrainingExperience.BEGINNER,
                TrainingGoal.GENERAL,
                List.of(),
                (short) 3,
                Map.of("publicProfile", true, "showRecords", false, "allowSharing", true)));

        UserProfileResponse response = userService.updateProfile(USER_ID, new UpdateProfileRequest(null, null,
                new UpdatePreferencesRequest(null, null, null, null, null,
                        new PrivacySettings(null, null, Boolean.FALSE))));

        assertThat(response.preferences().privacySettings().publicProfile()).isTrue();
        assertThat(response.preferences().privacySettings().showRecords()).isFalse();
        assertThat(response.preferences().privacySettings().allowSharing()).isFalse();
    }

    @Test
    @DisplayName("sanitizes the malformed privacy settings")
    void sanitizesTheMalformedPrivacySettings() {
        Map<String, Object> malformed = new LinkedHashMap<>();
        malformed.put("publicProfile", "sim");
        malformed.put("showRecords", 3);
        malformed.put("allowSharing", true);
        stubUserAndPreferences(preferences(
                PreferredUnits.KG,
                TrainingExperience.BEGINNER,
                TrainingGoal.GENERAL,
                List.of(),
                (short) 3,
                malformed));

        UserProfileResponse response = userService.getProfile(USER_ID);

        assertThat(response.preferences().privacySettings().publicProfile()).isFalse();
        assertThat(response.preferences().privacySettings().showRecords()).isTrue();
        assertThat(response.preferences().privacySettings().allowSharing()).isTrue();
    }

    @Test
    @DisplayName("rejects a number of training days out of the accepted range")
    void rejectsANumberOfTrainingDaysOutOfTheAcceptedRange() {
        stubUserAndPreferences(preferences(
                PreferredUnits.KG,
                TrainingExperience.BEGINNER,
                TrainingGoal.GENERAL,
                List.of(),
                (short) 3,
                Map.of()));

        assertThatThrownBy(() -> userService.updateProfile(USER_ID, new UpdateProfileRequest(null, null,
                new UpdatePreferencesRequest(null, null, null, null, 9, null))))
                .isInstanceOf(FieldValidationException.class)
                .hasMessageContaining("1 e 7");
    }

    @Test
    @DisplayName("rejects an invalid timezone")
    void rejectsAnInvalidTimezone() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user()));

        assertThatThrownBy(() -> userService.updateProfile(USER_ID,
                new UpdateProfileRequest(null, "Marte/Phobos", null)))
                .isInstanceOf(FieldValidationException.class)
                .hasMessageContaining("fuso horário");
    }

    @Test
    @DisplayName("rejects an equipment list that is not a list")
    void rejectsAnEquipmentListThatIsNotAList() {
        stubUserAndPreferences(preferences(
                PreferredUnits.KG,
                TrainingExperience.BEGINNER,
                TrainingGoal.GENERAL,
                List.of(),
                (short) 3,
                Map.of()));

        assertThatThrownBy(() -> userService.updateProfile(USER_ID, new UpdateProfileRequest(null, null,
                new UpdatePreferencesRequest(null, null, null, TextNode.valueOf("Barra"), null, null))))
                .isInstanceOf(FieldValidationException.class)
                .hasMessageContaining("lista de textos");
    }

    @Test
    @DisplayName("reads the equipment list informed in the request")
    void readsTheEquipmentListInformedInTheRequest() {
        stubUserAndPreferences(preferences(
                PreferredUnits.KG,
                TrainingExperience.BEGINNER,
                TrainingGoal.GENERAL,
                List.of(),
                (short) 3,
                Map.of()));

        UserProfileResponse response = userService.updateProfile(USER_ID, new UpdateProfileRequest(null, null,
                new UpdatePreferencesRequest(null, null, null,
                        JsonNodeFactory.instance.arrayNode().add("Barra").add("Halteres"), null, null)));

        assertThat(response.preferences().availableEquipment()).containsExactly("Barra", "Halteres");
    }

    @Test
    @DisplayName("reports the account of a removed user as not found")
    void reportsTheAccountOfARemovedUserAsNotFound() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getProfile(USER_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("resolves the owner only by the identifier of the token")
    void resolvesTheOwnerOnlyByTheIdentifierOfTheToken() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user()));
        when(userPreferencesRepository.findByUserId(USER_ID)).thenReturn(Optional.of(preferences(
                PreferredUnits.KG,
                TrainingExperience.BEGINNER,
                TrainingGoal.GENERAL,
                List.of(),
                (short) 3,
                Map.of())));

        userService.getProfile(USER_ID);

        verify(userRepository).findById(USER_ID);
        verify(userPreferencesRepository).findByUserId(USER_ID);
    }

    private void stubUserAndPreferences(UserPreferences preferences) {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user()));
        when(userPreferencesRepository.findByUserId(USER_ID)).thenReturn(Optional.of(preferences));
    }

    private static User user() {
        return new User(USER_ID, "Ana Souza", "ana@example.com", PASSWORD_HASH, UserRole.USER, "America/Sao_Paulo");
    }

    private static UserPreferences preferences(PreferredUnits units, TrainingExperience experience, TrainingGoal goal,
            List<String> equipment, short trainingDays, Map<String, Object> privacySettings) {
        return new UserPreferences(UUID.randomUUID(), USER_ID, units, experience, goal, equipment, trainingDays,
                privacySettings);
    }
}
