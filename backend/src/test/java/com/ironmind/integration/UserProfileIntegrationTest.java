package com.ironmind.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.auth.mail.RecoveryMailSender;
import com.ironmind.user.entity.User;
import com.ironmind.user.entity.UserPreferences;
import com.ironmind.user.repository.UserPreferencesRepository;
import com.ironmind.user.repository.UserRepository;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Integration test of the profile endpoints against a real PostgreSQL.
 *
 * <p>The database is provided by {@link TestDatabase}: an already running PostgreSQL when
 * {@code IT_JDBC_URL} is set, a Testcontainers instance otherwise. The test is skipped when no
 * PostgreSQL is reachable.
 *
 * <p>The test is not transactional and every account uses an e-mail unique per execution, so the
 * residual data of a previous run cannot collide with the unique constraint of {@code users}.
 */
@SpringBootTest
@AutoConfigureMockMvc
class UserProfileIntegrationTest {

    private static final String PASSWORD = "senha1234";

    /** Prefix of every e-mail created by this suite, used to clean the database. */
    private static final String TEST_EMAIL_PREFIX = "it-";

    @BeforeAll
    static void startDatabase() {
        TestDatabase.start();
    }

    @AfterAll
    static void stopDatabase() {
        TestDatabase.stop();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", TestDatabase::url);
        registry.add("spring.datasource.username", TestDatabase::username);
        registry.add("spring.datasource.password", TestDatabase::password);
        // The development sender is disabled so the test can capture the token itself.
        registry.add("app.mail.provider", () -> "test");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserPreferencesRepository userPreferencesRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private RecoveryMailSender recoveryMailSender;

    @Test
    @DisplayName("returns the nested profile of the authenticated user")
    void returnsTheNestedProfileOfTheAuthenticatedUser() throws Exception {
        RegisteredUser user = register("perfil");

        mockMvc.perform(get("/api/v1/users/me").header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(user.id()))
                .andExpect(jsonPath("$.user.name").value("Ana Souza"))
                .andExpect(jsonPath("$.user.email").value(user.email()))
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andExpect(jsonPath("$.preferences.preferredUnits").value("KG"))
                .andExpect(jsonPath("$.preferences.trainingExperience").value("BEGINNER"))
                .andExpect(jsonPath("$.preferences.goal").value("GENERAL"))
                .andExpect(jsonPath("$.preferences.availableEquipment").isArray())
                .andExpect(jsonPath("$.preferences.availableEquipment").isEmpty())
                .andExpect(jsonPath("$.preferences.trainingDays").value(3))
                .andExpect(jsonPath("$.preferences.privacySettings.publicProfile").value(false))
                .andExpect(jsonPath("$.preferences.privacySettings.showRecords").value(true))
                .andExpect(jsonPath("$.preferences.privacySettings.allowSharing").value(false))
                .andExpect(jsonPath("$.timezone").value("America/Sao_Paulo"));
    }

    @Test
    @DisplayName("merges the update and answers with the updated profile")
    void mergesTheUpdateAndAnswersWithTheUpdatedProfile() throws Exception {
        RegisteredUser user = register("merge");

        mockMvc.perform(patch("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ana Paula\",\"timezone\":\"America/Manaus\",\"preferences\":{"
                                + "\"goal\":\"HYPERTROPHY\",\"availableEquipment\":[\"Barra\",\"Halteres\"],"
                                + "\"trainingDays\":4,\"privacySettings\":{\"showRecords\":false}}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.name").value("Ana Paula"))
                .andExpect(jsonPath("$.timezone").value("America/Manaus"))
                .andExpect(jsonPath("$.preferences.goal").value("HYPERTROPHY"))
                .andExpect(jsonPath("$.preferences.preferredUnits").value("KG"))
                .andExpect(jsonPath("$.preferences.trainingExperience").value("BEGINNER"))
                .andExpect(jsonPath("$.preferences.availableEquipment[0]").value("Barra"))
                .andExpect(jsonPath("$.preferences.availableEquipment[1]").value("Halteres"))
                .andExpect(jsonPath("$.preferences.trainingDays").value(4))
                .andExpect(jsonPath("$.preferences.privacySettings.showRecords").value(false))
                .andExpect(jsonPath("$.preferences.privacySettings.publicProfile").value(false))
                .andExpect(jsonPath("$.preferences.privacySettings.allowSharing").value(false));

        mockMvc.perform(patch("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"preferences\":{\"goal\":\"STRENGTH\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preferences.goal").value("STRENGTH"))
                .andExpect(jsonPath("$.preferences.availableEquipment[0]").value("Barra"))
                .andExpect(jsonPath("$.preferences.availableEquipment[1]").value("Halteres"))
                .andExpect(jsonPath("$.preferences.trainingDays").value(4))
                .andExpect(jsonPath("$.preferences.privacySettings.showRecords").value(false));

        UserPreferences stored = userPreferencesRepository.findByUserId(UUID.fromString(user.id())).orElseThrow();
        assertThat(stored.getGoal().name()).isEqualTo("STRENGTH");
        assertThat(stored.getAvailableEquipment()).containsExactly("Barra", "Halteres");
        assertThat(stored.getTrainingDays()).isEqualTo((short) 4);
    }

    @Test
    @DisplayName("rejects an equipment list that is not a list")
    void rejectsAnEquipmentListThatIsNotAList() throws Exception {
        RegisteredUser user = register("equipamento");

        mockMvc.perform(patch("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"preferences\":{\"availableEquipment\":\"Barra\"}}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'preferences.availableEquipment')].message")
                        .isNotEmpty());
    }

    @Test
    @DisplayName("sanitizes the malformed privacy settings stored in the database")
    void sanitizesTheMalformedPrivacySettingsStoredInTheDatabase() throws Exception {
        RegisteredUser user = register("privacidade");
        UUID userId = UUID.fromString(user.id());

        UserPreferences preferences = userPreferencesRepository.findByUserId(userId).orElseThrow();
        preferences.update(preferences.getPreferredUnits(), preferences.getTrainingExperience(),
                preferences.getGoal(), preferences.getAvailableEquipment(), preferences.getTrainingDays(),
                Map.of("publicProfile", "sim", "showRecords", 3));
        userPreferencesRepository.save(preferences);

        mockMvc.perform(get("/api/v1/users/me").header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preferences.privacySettings.publicProfile").value(false))
                .andExpect(jsonPath("$.preferences.privacySettings.showRecords").value(true))
                .andExpect(jsonPath("$.preferences.privacySettings.allowSharing").value(false));
    }

    @Test
    @DisplayName("never answers the profile of another user")
    void neverAnswersTheProfileOfAnotherUser() throws Exception {
        RegisteredUser first = register("cross-consulta-a");
        RegisteredUser second = register("cross-consulta-b");

        mockMvc.perform(get("/api/v1/users/me")
                        .param("userId", second.id())
                        .param("id", second.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(first)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(first.id()))
                .andExpect(jsonPath("$.user.email").value(first.email()));
    }

    @Test
    @DisplayName("never changes the data of another user")
    void neverChangesTheDataOfAnotherUser() throws Exception {
        RegisteredUser first = register("cross-alteracao-a");
        RegisteredUser second = register("cross-alteracao-b");

        mockMvc.perform(patch("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(first))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + second.id() + "\",\"id\":\"" + second.id() + "\",\"user\":{"
                                + "\"id\":\"" + second.id() + "\",\"name\":\"Invasor\"},"
                                + "\"email\":\"invasor@example.com\",\"role\":\"ADMIN\","
                                + "\"name\":\"Ana Atualizada\",\"preferences\":{\"goal\":\"ENDURANCE\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(first.id()))
                .andExpect(jsonPath("$.user.name").value("Ana Atualizada"))
                .andExpect(jsonPath("$.user.email").value(first.email()))
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andExpect(jsonPath("$.preferences.goal").value("ENDURANCE"));

        mockMvc.perform(get("/api/v1/users/me").header(HttpHeaders.AUTHORIZATION, bearer(second)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(second.id()))
                .andExpect(jsonPath("$.user.name").value("Ana Souza"))
                .andExpect(jsonPath("$.preferences.goal").value("GENERAL"));

        User untouched = userRepository.findById(UUID.fromString(second.id())).orElseThrow();
        assertThat(untouched.getName()).isEqualTo("Ana Souza");
        assertThat(untouched.getEmail()).isEqualTo(second.email());
        assertThat(untouched.getRole().name()).isEqualTo("USER");
    }

    @Test
    @DisplayName("answers not found when the user of the token was removed")
    void answersNotFoundWhenTheUserOfTheTokenWasRemoved() throws Exception {
        RegisteredUser user = register("removido");
        userRepository.deleteById(UUID.fromString(user.id()));

        mockMvc.perform(get("/api/v1/users/me").header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    @DisplayName("answers unauthorized without a token")
    void answersUnauthorizedWithoutAToken() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("reports the exercise of another user as not found")
    void reportsTheExerciseOfAnotherUserAsNotFound() throws Exception {
        RegisteredUser owner = register("exercicio-dono");
        RegisteredUser other = register("exercicio-invasor");

        String created = mockMvc.perform(post("/api/v1/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Supino com elástico\",\"primaryMuscleGroup\":\"Peito\","
                                + "\"equipment\":\"Elástico\",\"movementType\":\"ISOLATION\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String exerciseId = objectMapper.readTree(created).path("id").asText();

        mockMvc.perform(patch("/api/v1/exercises/" + exerciseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Exercício roubado\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(get("/api/v1/exercises/" + exerciseId).header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Supino com elástico"));
    }

    private RegisteredUser register(String prefix) throws Exception {
        String email = uniqueEmail(prefix);
        String body = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ana Souza\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD
                                + "\",\"timezone\":\"America/Sao_Paulo\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        JsonNode json = objectMapper.readTree(body);
        return new RegisteredUser(
                json.path("user").path("id").asText(),
                email,
                json.path("accessToken").asText());
    }

    private static String bearer(RegisteredUser user) {
        return "Bearer " + user.token();
    }

    private static String uniqueEmail(String prefix) {
        return TEST_EMAIL_PREFIX + prefix + "-" + UUID.randomUUID() + "@example.com";
    }

    /**
     * Removes the rows created by the test.
     *
     * <p>The accounts are created through the API, so they are committed and survive the rollback
     * of the test transaction. Deleting the account cascades to its preferences, tokens and
     * custom exercises.
     */
    @AfterEach
    void removeTestData() {
        jdbcTemplate.update("DELETE FROM users WHERE email LIKE ?", TEST_EMAIL_PREFIX + "%@example.com");
    }

    /**
     * Account created by the test, with the token used to authenticate the requests.
     *
     * @param id    identifier of the account
     * @param email e-mail of the account
     * @param token access token of the account
     */
    private record RegisteredUser(String id, String email, String token) {
    }
}
