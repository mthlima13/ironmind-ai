package com.ironmind.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.auth.mail.RecoveryMailSender;
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
 * Integration test of the deletion of the account against a real PostgreSQL.
 *
 * <p>The suite proves the contract demanded by Google Play and by SPEC.md section 14.3: the owner
 * can erase the account inside the app, the password is required, and the deletion really removes
 * every record that belongs to the user instead of only hiding it.
 *
 * <p>The database is provided by {@link TestDatabase}, the same way as the other integration
 * suites. Every account uses an e-mail unique per execution, so the residual data of a previous
 * run cannot collide with the unique constraint of {@code users}.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AccountDeletionIntegrationTest {

    private static final String PASSWORD = "senha1234";

    /** Prefix of every e-mail created by this suite, used to clean the database. */
    private static final String TEST_EMAIL_PREFIX = "it-del-";

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
        registry.add("app.mail.provider", () -> "test");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private RecoveryMailSender recoveryMailSender;

    @Test
    @DisplayName("deletes the account and every record it owns")
    void deletesTheAccountAndEveryRecordItOwns() throws Exception {
        RegisteredUser user = register("completo");
        UUID userId = UUID.fromString(user.id());
        UUID systemExerciseId = firstSystemExerciseId();
        createOwnedData(user, systemExerciseId);

        assertThat(count("SELECT count(*) FROM workout_programs WHERE user_id = ?", userId)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM workout_sessions WHERE user_id = ?", userId)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM ai_recommendations WHERE user_id = ?", userId)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM user_preferences WHERE user_id = ?", userId)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM refresh_tokens WHERE user_id = ?", userId)).isPositive();
        assertThat(count("SELECT count(*) FROM exercises WHERE created_by_user_id = ?", userId)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM injury_restrictions WHERE user_id = ?", userId)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM personal_records WHERE user_id = ?", userId)).isPositive();
        assertThat(count("SELECT count(*) FROM session_exercises se JOIN workout_sessions s "
                + "ON s.id = se.session_id WHERE s.user_id = ?", userId)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM exercise_sets es JOIN session_exercises se "
                + "ON se.id = es.session_exercise_id JOIN workout_sessions s ON s.id = se.session_id "
                + "WHERE s.user_id = ?", userId)).isEqualTo(1);

        deleteAccount(user, PASSWORD)
                .andExpect(status().isNoContent());

        assertThat(count("SELECT count(*) FROM users WHERE id = ?", userId)).isZero();
        assertThat(count("SELECT count(*) FROM user_preferences WHERE user_id = ?", userId)).isZero();
        assertThat(count("SELECT count(*) FROM refresh_tokens WHERE user_id = ?", userId)).isZero();
        assertThat(count("SELECT count(*) FROM password_reset_tokens WHERE user_id = ?", userId)).isZero();
        assertThat(count("SELECT count(*) FROM workout_programs WHERE user_id = ?", userId)).isZero();
        assertThat(count("SELECT count(*) FROM workout_sessions WHERE user_id = ?", userId)).isZero();
        assertThat(count("SELECT count(*) FROM personal_records WHERE user_id = ?", userId)).isZero();
        assertThat(count("SELECT count(*) FROM injury_restrictions WHERE user_id = ?", userId)).isZero();
        assertThat(count("SELECT count(*) FROM ai_recommendations WHERE user_id = ?", userId)).isZero();
        assertThat(count("SELECT count(*) FROM exercises WHERE created_by_user_id = ?", userId)).isZero();

        // The session, the exercise of the session and the set are reachable only through the
        // session of the user, which was removed by the cascade.
        assertThat(count("SELECT count(*) FROM session_exercises WHERE session_id NOT IN "
                + "(SELECT id FROM workout_sessions)")).isZero();
        assertThat(count("SELECT count(*) FROM exercise_sets WHERE session_exercise_id NOT IN "
                + "(SELECT id FROM session_exercises)")).isZero();

        // The catalog shared by every account is untouched.
        assertThat(count("SELECT count(*) FROM exercises WHERE id = ?", systemExerciseId)).isEqualTo(1);
    }

    @Test
    @DisplayName("keeps the account and its data when the password is wrong")
    void keepsTheAccountAndItsDataWhenThePasswordIsWrong() throws Exception {
        RegisteredUser user = register("senha-errada");
        UUID userId = UUID.fromString(user.id());

        deleteAccount(user, "senha-errada-1")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("password"));

        assertThat(count("SELECT count(*) FROM users WHERE id = ?", userId)).isEqualTo(1);

        mockMvc.perform(get("/api/v1/users/me").header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(user.id()));
    }

    @Test
    @DisplayName("requires the password of the account")
    void requiresThePasswordOfTheAccount() throws Exception {
        RegisteredUser user = register("sem-senha");

        mockMvc.perform(delete("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("password"));
    }

    @Test
    @DisplayName("answers unauthorized without a token")
    void answersUnauthorizedWithoutAToken() throws Exception {
        mockMvc.perform(delete("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("never deletes the account of another user")
    void neverDeletesTheAccountOfAnotherUser() throws Exception {
        RegisteredUser owner = register("dono");
        RegisteredUser other = register("invasor");

        // The identifiers of another account in the body change nothing: the owner of the
        // operation always comes from the access token.
        mockMvc.perform(delete("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"" + PASSWORD + "\",\"userId\":\"" + other.id() + "\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/users/me").header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(other.id()));
    }

    @Test
    @DisplayName("does not authenticate with the tokens of a deleted account")
    void doesNotAuthenticateWithTheTokensOfADeletedAccount() throws Exception {
        RegisteredUser user = register("tokens");

        deleteAccount(user, PASSWORD).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/users/me").header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + user.refreshToken() + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + user.email() + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    @DisplayName("frees the e-mail so a new account can use it")
    void freesTheEmailSoANewAccountCanUseIt() throws Exception {
        RegisteredUser user = register("reuso");

        deleteAccount(user, PASSWORD).andExpect(status().isNoContent());

        RegisteredUser recreated = registerWithEmail(user.email());

        assertThat(recreated.id()).isNotEqualTo(user.id());
        assertThat(recreated.email()).isEqualTo(user.email());

        mockMvc.perform(get("/api/v1/users/me").header(HttpHeaders.AUTHORIZATION, bearer(recreated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value(user.email()));
    }

    /**
     * Creates the records that must be removed by the cascade: a custom exercise, a program, a
     * session with one exercise and one set, a restriction and an AI recommendation.
     */
    private void createOwnedData(RegisteredUser user, UUID systemExerciseId) throws Exception {
        mockMvc.perform(post("/api/v1/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Supino com elástico\",\"primaryMuscleGroup\":\"Peito\","
                                + "\"equipment\":\"Elástico\",\"movementType\":\"ISOLATION\"}"))
                .andExpect(status().isCreated());

        String program = mockMvc.perform(post("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Programa da exclusão\",\"description\":\"Teste\","
                                + "\"goal\":\"GENERAL\",\"splitType\":\"FULL_BODY\",\"days\":[{\"name\":\"Dia 1\","
                                + "\"exercises\":[{\"exerciseId\":\"" + systemExerciseId + "\",\"targetSets\":3,"
                                + "\"targetRepsMin\":8,\"targetRepsMax\":12,\"restSeconds\":90}]}]}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String programId = objectMapper.readTree(program).path("id").asText();

        String session = mockMvc.perform(post("/api/v1/workout-sessions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"programId\":\"" + programId + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String sessionId = objectMapper.readTree(session).path("id").asText();

        String sessionExercise = mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"exerciseId\":\"" + systemExerciseId + "\",\"position\":1}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String sessionExerciseId = objectMapper.readTree(sessionExercise).path("id").asText();

        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/sets")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionExerciseId\":\"" + sessionExerciseId + "\",\"weightKg\":40.00,"
                                + "\"repetitions\":10,\"perceivedExertion\":8,\"restAfterSeconds\":90}"))
                .andExpect(status().isCreated());

        mockMvc.perform(put("/api/v1/restrictions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"restrictions\":[{\"bodyRegion\":\"Ombro\","
                                + "\"description\":\"Desconforto no supino\",\"isActive\":true,\"exerciseIds\":[]}]}"))
                .andExpect(status().isOk());

        jdbcTemplate.update("INSERT INTO ai_recommendations (user_id, recommendation_type, status) "
                + "VALUES (?, 'COACH_REPLY', 'PENDING')", UUID.fromString(user.id()));
    }

    private org.springframework.test.web.servlet.ResultActions deleteAccount(RegisteredUser user, String password)
            throws Exception {
        return mockMvc.perform(delete("/api/v1/users/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"" + password + "\"}"));
    }

    private long count(String sql, Object... arguments) {
        Long value = jdbcTemplate.queryForObject(sql, Long.class, arguments);
        return value == null ? 0L : value;
    }

    private UUID firstSystemExerciseId() {
        String id = jdbcTemplate.queryForObject(
                "SELECT id::text FROM exercises WHERE is_system = true ORDER BY name LIMIT 1", String.class);
        return UUID.fromString(id);
    }

    private RegisteredUser register(String prefix) throws Exception {
        return registerWithEmail(uniqueEmail(prefix));
    }

    private RegisteredUser registerWithEmail(String email) throws Exception {
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
                json.path("accessToken").asText(),
                json.path("refreshToken").asText());
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
     * Account created by the test, with the tokens used to authenticate the requests.
     *
     * @param id           identifier of the account
     * @param email        e-mail of the account
     * @param token        access token of the account
     * @param refreshToken refresh token of the account
     */
    private record RegisteredUser(String id, String email, String token, String refreshToken) {
    }
}
