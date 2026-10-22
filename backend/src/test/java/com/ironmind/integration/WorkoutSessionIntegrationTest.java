package com.ironmind.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.auth.mail.RecoveryMailSender;
import java.util.UUID;
import org.hamcrest.Matchers;
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
 * Integration test of the session and set endpoints against a real PostgreSQL.
 *
 * <p>The database is provided by {@link TestDatabase}: an already running PostgreSQL when
 * {@code IT_JDBC_URL} is set, a Testcontainers instance otherwise. The test is skipped when no
 * PostgreSQL is reachable.
 *
 * <p>The test is not transactional and every account uses an e-mail unique per execution, so the
 * residual data of a previous run cannot collide with the unique constraint of {@code users}. The
 * cleanup removes the accounts, and the cascade of the database removes their sessions and sets.
 */
@SpringBootTest
@AutoConfigureMockMvc
class WorkoutSessionIntegrationTest {

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
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private RecoveryMailSender recoveryMailSender;

    @Test
    @DisplayName("starts a session from a program day with the exercises of the day embedded")
    void startsASessionFromAProgramDayWithTheExercisesOfTheDayEmbedded() throws Exception {
        RegisteredUser user = register("sessao-dia");
        String[] exercises = catalogExerciseIds(2);
        String programId = createProgram(user.token(), "Push / Pull / Legs", exercises);
        String dayId = firstDayOf(user.token(), programId);

        mockMvc.perform(post("/api/v1/workout-sessions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"programId\":\"" + programId + "\",\"programDayId\":\"" + dayId + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.programId").value(programId))
                .andExpect(jsonPath("$.programDayId").value(dayId))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.completedAt").value(Matchers.nullValue()))
                .andExpect(jsonPath("$.exercises.length()").value(2))
                .andExpect(jsonPath("$.exercises[0].position").value(1))
                .andExpect(jsonPath("$.exercises[0].exerciseId").value(exercises[0]))
                .andExpect(jsonPath("$.exercises[0].exercise.name").isNotEmpty())
                .andExpect(jsonPath("$.exercises[0].notes").value("4x6-8 (descanso 150s)"))
                .andExpect(jsonPath("$.exercises[0].targetSets").value(4))
                .andExpect(jsonPath("$.exercises[0].targetRepsMin").value(6))
                .andExpect(jsonPath("$.exercises[0].targetRepsMax").value(8))
                .andExpect(jsonPath("$.exercises[0].restSeconds").value(150))
                .andExpect(jsonPath("$.exercises[0].sets").isEmpty())
                .andExpect(jsonPath("$.exercises[1].position").value(2))
                .andExpect(jsonPath("$.exercises[1].exerciseId").value(exercises[1]));
    }

    @Test
    @DisplayName("keeps the plan of the day in the session, and no plan in a free session")
    void keepsThePlanOfTheDayInTheSession() throws Exception {
        RegisteredUser user = register("sessao-plano");
        String[] exercises = catalogExerciseIds(1);
        String programId = createProgram(user.token(), "Full Body", exercises);
        String dayId = firstDayOf(user.token(), programId);

        // The plan travels in dedicated columns, so it can be compared with
        // what was performed, and in the readable summary for the user.
        mockMvc.perform(post("/api/v1/workout-sessions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"programId\":\"" + programId + "\",\"programDayId\":\"" + dayId + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.exercises[0].targetSets").value(4))
                .andExpect(jsonPath("$.exercises[0].targetRepsMin").value(6))
                .andExpect(jsonPath("$.exercises[0].targetRepsMax").value(8))
                .andExpect(jsonPath("$.exercises[0].restSeconds").value(150));

        // A free session has no plan: the exercise was added without one.
        String sessionId = startSession(user.token(), null, null);
        String sessionExerciseId = addExercise(user.token(), sessionId, exercises[0], 1);

        mockMvc.perform(get("/api/v1/workout-sessions/" + sessionId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises[0].id").value(sessionExerciseId))
                .andExpect(jsonPath("$.exercises[0].targetSets").value(Matchers.nullValue()))
                .andExpect(jsonPath("$.exercises[0].targetRepsMin").value(Matchers.nullValue()))
                .andExpect(jsonPath("$.exercises[0].restSeconds").value(Matchers.nullValue()));
    }

    @Test
    @DisplayName("registers the sets of an exercise with the number assigned by the server")
    void registersTheSetsOfAnExerciseWithTheNumberAssignedByTheServer() throws Exception {
        RegisteredUser user = register("sessao-series");
        String exerciseId = catalogExerciseIds(1)[0];

        String sessionId = startSession(user.token(), null, null);
        String sessionExerciseId = addExercise(user.token(), sessionId, exerciseId, 1);

        String first = registerSet(user.token(), sessionId, sessionExerciseId, "80.0", 10, "key-1");
        String second = registerSet(user.token(), sessionId, sessionExerciseId, "80.0", 8, "key-2");

        assertThat(objectMapper.readTree(first).path("setNumber").asInt()).isEqualTo(1);
        assertThat(objectMapper.readTree(second).path("setNumber").asInt()).isEqualTo(2);
        assertThat(objectMapper.readTree(first).path("weightKg").asDouble()).isEqualTo(80.0);
        assertThat(objectMapper.readTree(first).path("repetitions").asInt()).isEqualTo(10);

        mockMvc.perform(get("/api/v1/workout-sessions/" + sessionId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises[0].sets.length()").value(2))
                .andExpect(jsonPath("$.exercises[0].sets[0].setNumber").value(1))
                .andExpect(jsonPath("$.exercises[0].sets[1].setNumber").value(2));
    }

    @Test
    @DisplayName("returns the same series when the idempotency key is replayed")
    void returnsTheSameSeriesWhenTheIdempotencyKeyIsReplayed() throws Exception {
        RegisteredUser user = register("sessao-idempotencia");
        String exerciseId = catalogExerciseIds(1)[0];
        String sessionId = startSession(user.token(), null, null);
        String sessionExerciseId = addExercise(user.token(), sessionId, exerciseId, 1);

        String body = "{\"sessionExerciseId\":\"" + sessionExerciseId + "\",\"weightKg\":80.0,"
                + "\"repetitions\":10,\"perceivedExertion\":8,\"restAfterSeconds\":90}";
        String key = UUID.randomUUID().toString();

        String first = mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/sets")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String second = mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/sets")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(objectMapper.readTree(second).path("id").asText())
                .isEqualTo(objectMapper.readTree(first).path("id").asText());

        Integer stored = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM exercise_sets WHERE session_exercise_id = ?", Integer.class,
                UUID.fromString(sessionExerciseId));
        assertThat(stored).isEqualTo(1);
    }

    @Test
    @DisplayName("refuses the reuse of an idempotency key with a different body")
    void refusesTheReuseOfAnIdempotencyKeyWithADifferentBody() throws Exception {
        RegisteredUser user = register("sessao-idemp-conflito");
        String exerciseId = catalogExerciseIds(1)[0];
        String sessionId = startSession(user.token(), null, null);
        String sessionExerciseId = addExercise(user.token(), sessionId, exerciseId, 1);
        String key = UUID.randomUUID().toString();

        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/sets")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionExerciseId\":\"" + sessionExerciseId + "\",\"weightKg\":80.0,"
                                + "\"repetitions\":10}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/sets")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionExerciseId\":\"" + sessionExerciseId + "\",\"weightKg\":100.0,"
                                + "\"repetitions\":10}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
    }

    @Test
    @DisplayName("completes a session and refuses new sets afterwards")
    void completesASessionAndRefusesNewSetsAfterwards() throws Exception {
        RegisteredUser user = register("sessao-conclusao");
        String exerciseId = catalogExerciseIds(1)[0];
        String sessionId = startSession(user.token(), null, null);
        String sessionExerciseId = addExercise(user.token(), sessionId, exerciseId, 1);

        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/complete")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.completedAt").isNotEmpty());

        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/sets")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionExerciseId\":\"" + sessionExerciseId + "\",\"weightKg\":80.0,"
                                + "\"repetitions\":10}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));

        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/complete")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    @DisplayName("corrects and deletes a registered series")
    void correctsAndDeletesARegisteredSeries() throws Exception {
        RegisteredUser user = register("sessao-correcao");
        String exerciseId = catalogExerciseIds(1)[0];
        String sessionId = startSession(user.token(), null, null);
        String sessionExerciseId = addExercise(user.token(), sessionId, exerciseId, 1);

        String setId = objectMapper.readTree(
                registerSet(user.token(), sessionId, sessionExerciseId, "80.0", 10, UUID.randomUUID().toString()))
                .path("id").asText();

        mockMvc.perform(patch("/api/v1/sets/" + setId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"weightKg\":82.5,\"repetitions\":8}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(setId))
                .andExpect(jsonPath("$.setNumber").value(1))
                .andExpect(jsonPath("$.weightKg").value(82.5))
                .andExpect(jsonPath("$.repetitions").value(8));

        mockMvc.perform(patch("/api/v1/sets/" + setId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"weightKg\":null,\"repetitions\":8}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(setId))
                .andExpect(jsonPath("$.setNumber").value(1))
                .andExpect(jsonPath("$.weightKg").value(Matchers.nullValue()))
                .andExpect(jsonPath("$.repetitions").value(8));

        mockMvc.perform(delete("/api/v1/sets/" + setId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/workout-sessions/" + sessionId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises[0].sets.length()").value(0));
    }

    @Test
    @DisplayName("lists only the sessions of the authenticated user")
    void listsOnlyTheSessionsOfTheAuthenticatedUser() throws Exception {
        RegisteredUser owner = register("sessao-dono");
        RegisteredUser other = register("sessao-invasor");

        startSession(owner.token(), null, null);
        startSession(owner.token(), null, null);
        startSession(other.token(), null, null);

        mockMvc.perform(get("/api/v1/workout-sessions").param("page", "0").param("size", "20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].exercises").isArray());
    }

    @Test
    @DisplayName("never answers the session of another user")
    void neverAnswersTheSessionOfAnotherUser() throws Exception {
        RegisteredUser owner = register("sessao-acesso-dono");
        RegisteredUser other = register("sessao-acesso-invasor");
        String exerciseId = catalogExerciseIds(1)[0];

        String sessionId = startSession(owner.token(), null, null);
        String sessionExerciseId = addExercise(owner.token(), sessionId, exerciseId, 1);
        String setId = objectMapper.readTree(
                registerSet(owner.token(), sessionId, sessionExerciseId, "80.0", 10, UUID.randomUUID().toString()))
                .path("id").asText();

        mockMvc.perform(get("/api/v1/workout-sessions/" + sessionId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(patch("/api/v1/workout-sessions/" + sessionId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PAUSED\"}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(patch("/api/v1/sets/" + setId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"weightKg\":90.0,\"repetitions\":9}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/v1/sets/" + setId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/workout-sessions/" + sessionId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(sessionId));
    }

    @Test
    @DisplayName("answers unauthorized without a token")
    void answersUnauthorizedWithoutAToken() throws Exception {
        mockMvc.perform(get("/api/v1/workout-sessions"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        mockMvc.perform(post("/api/v1/workout-sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"programId\":null,\"programDayId\":null}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("refuses an exercise that does not exist in the catalog")
    void refusesAnExerciseThatDoesNotExistInTheCatalog() throws Exception {
        RegisteredUser user = register("sessao-exercicio");
        String sessionId = startSession(user.token(), null, null);

        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"exerciseId\":\"" + UUID.randomUUID() + "\",\"position\":1,\"notes\":null}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("exerciseId"));
    }

    @Test
    @DisplayName("refuses the same exercise twice in the same session")
    void refusesTheSameExerciseTwiceInTheSameSession() throws Exception {
        RegisteredUser user = register("sessao-exercicio-dup");
        String exerciseId = catalogExerciseIds(1)[0];
        String sessionId = startSession(user.token(), null, null);

        addExercise(user.token(), sessionId, exerciseId, 1);

        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"exerciseId\":\"" + exerciseId + "\",\"position\":2,\"notes\":null}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    private String startSession(String token, String programId, String programDayId) throws Exception {
        String body = "{\"programId\":" + quote(programId) + ",\"programDayId\":" + quote(programDayId) + "}";
        String created = mockMvc.perform(post("/api/v1/workout-sessions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(created).path("id").asText();
    }

    private String addExercise(String token, String sessionId, String exerciseId, int position) throws Exception {
        String created = mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"exerciseId\":\"" + exerciseId + "\",\"position\":" + position + ",\"notes\":null}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(created).path("id").asText();
    }

    private String registerSet(String token, String sessionId, String sessionExerciseId, String weightKg,
            int repetitions, String idempotencyKey) throws Exception {
        String created = mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/sets")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionExerciseId\":\"" + sessionExerciseId + "\",\"weightKg\":" + weightKg
                                + ",\"repetitions\":" + repetitions + ",\"perceivedExertion\":8,\"restAfterSeconds\":90}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return created;
    }

    private String createProgram(String token, String name, String[] exerciseIds) throws Exception {
        StringBuilder exercises = new StringBuilder();
        for (String exerciseId : exerciseIds) {
            if (exercises.length() > 0) {
                exercises.append(',');
            }
            exercises.append("{\"exerciseId\":\"").append(exerciseId)
                    .append("\",\"targetSets\":4,\"targetRepsMin\":6,\"targetRepsMax\":8,\"restSeconds\":150,"
                            + "\"notes\":null}");
        }
        String body = "{\"name\":\"" + name + "\",\"description\":null,\"goal\":\"HYPERTROPHY\","
                + "\"splitType\":\"PPL\",\"days\":[{\"name\":\"Peito e tríceps\",\"exercises\":[" + exercises + "]}]}";

        String created = mockMvc.perform(post("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(created).path("id").asText();
    }

    private String firstDayOf(String token, String programId) throws Exception {
        String body = mockMvc.perform(get("/api/v1/programs/" + programId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("days").get(0).path("id").asText();
    }

    private String[] catalogExerciseIds(int quantity) throws Exception {
        String body = mockMvc.perform(get("/api/v1/exercises").param("page", "0").param("size", String.valueOf(quantity)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode content = objectMapper.readTree(body).path("content");
        assertThat(content).isNotEmpty();
        String[] ids = new String[quantity];
        for (int index = 0; index < quantity; index++) {
            ids[index] = content.get(index).path("id").asText();
        }
        return ids;
    }

    private RegisteredUser register(String prefix) throws Exception {
        String email = uniqueEmail(prefix);
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ana Souza\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD
                                + "\",\"timezone\":\"America/Sao_Paulo\"}"))
                .andExpect(status().isCreated());

        String body = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode json = objectMapper.readTree(body);
        return new RegisteredUser(json.path("user").path("id").asText(), email, json.path("accessToken").asText());
    }

    private static String quote(String value) {
        return value == null ? "null" : "\"" + value + "\"";
    }

    private static String bearer(RegisteredUser user) {
        return "Bearer " + user.token();
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private static String uniqueEmail(String prefix) {
        return TEST_EMAIL_PREFIX + prefix + "-" + UUID.randomUUID() + "@example.com";
    }

    /**
     * Removes the rows created by the test.
     *
     * <p>The accounts are created through the API, so they are committed and survive the rollback
     * of the test transaction. Deleting the account cascades to its sessions, exercises and sets.
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
