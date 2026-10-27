package com.ironmind.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.auth.mail.RecoveryMailSender;
import java.util.ArrayList;
import java.util.List;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * Characterization of the isolation between accounts.
 *
 * <p>Every test creates two independent accounts and proves that one of them can never read,
 * change or delete a resource of the other. The suite covers the resources that are not exercised
 * by the domain suites: personal exercises in the public catalog, foreign identifiers in the body,
 * foreign programs and sessions, records, analytics and restrictions.
 *
 * <p>This suite records the behavior that must survive the migration of the identity to the
 * infrastructure header and the migration of the persistence to MongoDB. It does not test the
 * authentication mechanism itself; it tests the authorization rules that the backend must keep
 * enforcing.
 *
 * <p>The database is provided by {@link TestDatabase}: an already running PostgreSQL when
 * {@code IT_JDBC_URL} is set, a Testcontainers instance otherwise. The suite is skipped when no
 * PostgreSQL is reachable.
 */
@SpringBootTest
@AutoConfigureMockMvc
class UserIsolationIntegrationTest {

    private static final String PASSWORD = "senha1234";

    /** Prefix of every e-mail created by this suite, used to clean the database. */
    private static final String TEST_EMAIL_PREFIX = "it-iso-";

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
    @DisplayName("keeps personal exercises out of the public catalog")
    void keepsPersonalExercisesOutOfThePublicCatalog() throws Exception {
        RegisteredUser owner = register("catalogo-dono");
        String exerciseId = createExercise(owner, "Exercício privado do dono");

        // The catalog is public, but only the global exercises are visible without identity.
        String anonymous = mockMvc.perform(get("/api/v1/exercises").param("size", "100"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(idsOf(anonymous)).doesNotContain(exerciseId);

        mockMvc.perform(get("/api/v1/exercises/" + exerciseId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        // The owner sees the exercise, and the answer states who owns it.
        mockMvc.perform(get("/api/v1/exercises/" + exerciseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(exerciseId))
                .andExpect(jsonPath("$.createdByUserId").value(owner.id()));
    }

    @Test
    @DisplayName("never lists, reads or changes the personal exercise of another user")
    void neverExposesThePersonalExerciseOfAnotherUser() throws Exception {
        RegisteredUser owner = register("exercicio-dono");
        RegisteredUser other = register("exercicio-outro");
        String exerciseId = createExercise(owner, "Supino com elástico");

        String listed = mockMvc.perform(get("/api/v1/exercises").param("size", "100")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(idsOf(listed)).doesNotContain(exerciseId);

        mockMvc.perform(get("/api/v1/exercises").param("onlyMine", "true")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        mockMvc.perform(get("/api/v1/exercises/" + exerciseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(patch("/api/v1/exercises/" + exerciseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Exercício roubado\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(get("/api/v1/exercises/" + exerciseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Supino com elástico"));
    }

    @Test
    @DisplayName("refuses a program that references the private exercise of another user")
    void refusesAProgramWithThePrivateExerciseOfAnotherUser() throws Exception {
        RegisteredUser owner = register("programa-exercicio-dono");
        RegisteredUser other = register("programa-exercicio-outro");
        String exerciseId = createExercise(owner, "Exercício privado");

        mockMvc.perform(post("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(programBody("Programa indevido", exerciseId)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("days[0].exercises[0].exerciseId"));
    }

    @Test
    @DisplayName("never starts a session from the program of another user")
    void neverStartsASessionFromTheProgramOfAnotherUser() throws Exception {
        RegisteredUser owner = register("sessao-programa-dono");
        RegisteredUser other = register("sessao-programa-outro");
        Program program = createProgram(owner);

        mockMvc.perform(post("/api/v1/workout-sessions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"programId\":\"" + program.id() + "\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/v1/workout-sessions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"programId\":\"" + program.id() + "\",\"programDayId\":\""
                                + program.dayId() + "\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/v1/workout-sessions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"programDayId\":\"" + program.dayId() + "\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        // Positive control: the owner can start the session from the same program.
        startSession(owner, program)
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("never writes inside the session of another user")
    void neverWritesInsideTheSessionOfAnotherUser() throws Exception {
        RegisteredUser owner = register("sessao-escrita-dono");
        RegisteredUser other = register("sessao-escrita-outro");
        String exerciseId = catalogExerciseId();
        String sessionResponse = startSession(owner, null).andReturn().getResponse().getContentAsString();
        String sessionId = objectMapper.readTree(sessionResponse).path("id").asText();
        String sessionExerciseId = addExercise(owner, sessionId, exerciseId);

        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"exerciseId\":\"" + exerciseId + "\",\"position\":2}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/sets")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionExerciseId\":\"" + sessionExerciseId + "\",\"weightKg\":80.0,"
                                + "\"repetitions\":10}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        // The owner's session is untouched.
        mockMvc.perform(get("/api/v1/workout-sessions/" + sessionId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exercises.length()").value(1))
                .andExpect(jsonPath("$.exercises[0].sets.length()").value(0));
    }

    @Test
    @DisplayName("never mixes the records or the analytics of two users")
    void neverMixesRecordsOrAnalytics() throws Exception {
        RegisteredUser owner = register("metricas-dono");
        RegisteredUser other = register("metricas-outro");
        String exerciseId = catalogExerciseId();

        String created = startSession(owner, null).andReturn().getResponse().getContentAsString();
        String sessionId = objectMapper.readTree(created).path("id").asText();
        String sessionExerciseId = addExercise(owner, sessionId, exerciseId);
        registerSet(owner, sessionId, sessionExerciseId, "100.0", 5);
        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/complete")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/records").header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.content[0].exerciseId").value(exerciseId));

        mockMvc.perform(get("/api/v1/records").header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.content").isEmpty());

        String ownerOverview = mockMvc.perform(get("/api/v1/analytics/overview")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode ownerSummary = objectMapper.readTree(ownerOverview).path("summary");
        assertThat(ownerSummary.path("completedSessions").asInt()).isEqualTo(1);
        assertThat(ownerSummary.path("totalVolumeKg").asDouble()).isEqualTo(500.0);

        String otherOverview = mockMvc.perform(get("/api/v1/analytics/overview")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode otherJson = objectMapper.readTree(otherOverview);
        assertThat(otherJson.path("summary").path("completedSessions").asInt()).isZero();
        assertThat(otherJson.path("summary").path("totalVolumeKg").asDouble()).isZero();
        assertThat(otherJson.path("recentSessions")).isEmpty();
    }

    @Test
    @DisplayName("scopes the injury restrictions to the owner")
    void scopesTheInjuryRestrictionsToTheOwner() throws Exception {
        RegisteredUser owner = register("restricao-dono");
        RegisteredUser other = register("restricao-outro");

        mockMvc.perform(put("/api/v1/restrictions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(restrictionsBody(owner.id(), "Ombro")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/restrictions").header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        // Identifiers of another account in the body do not change the owner of the write.
        mockMvc.perform(put("/api/v1/restrictions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(restrictionsBody(owner.id(), "Joelho")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].bodyRegion").value("Joelho"));

        mockMvc.perform(get("/api/v1/restrictions").header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].bodyRegion").value("Ombro"));
    }

    @Test
    @DisplayName("ignores identifiers of another user sent in the body")
    void ignoresIdentifiersOfAnotherUserInTheBody() throws Exception {
        RegisteredUser owner = register("corpo-dono");
        RegisteredUser other = register("corpo-outro");

        String exerciseBody = mockMvc.perform(post("/api/v1/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Exercício do corpo\",\"primaryMuscleGroup\":\"Peito\","
                                + "\"equipment\":\"Barra\",\"movementType\":\"COMPOUND\","
                                + "\"userId\":\"" + other.id() + "\",\"userUuid\":\"" + other.id() + "\","
                                + "\"createdByUserId\":\"" + other.id() + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.createdByUserId").value(owner.id()))
                .andReturn().getResponse().getContentAsString();
        String exerciseId = objectMapper.readTree(exerciseBody).path("id").asText();

        mockMvc.perform(get("/api/v1/exercises/" + exerciseId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Programa do corpo\",\"goal\":\"HYPERTROPHY\",\"splitType\":\"FULL_BODY\","
                                + "\"userId\":\"" + other.id() + "\",\"userUuid\":\"" + other.id() + "\","
                                + "\"days\":[{\"name\":\"Dia 1\",\"exercises\":[{\"exerciseId\":\"" + exerciseId
                                + "\",\"targetSets\":3,\"targetRepsMin\":8,\"targetRepsMax\":12,"
                                + "\"restSeconds\":90}]}]}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/programs").header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
        mockMvc.perform(get("/api/v1/programs").header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        String sessionBody = mockMvc.perform(post("/api/v1/workout-sessions")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"" + other.id() + "\",\"userUuid\":\"" + other.id() + "\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String sessionId = objectMapper.readTree(sessionBody).path("id").asText();

        mockMvc.perform(get("/api/v1/workout-sessions/" + sessionId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("scopes the idempotency keys by user")
    void scopesTheIdempotencyKeysByUser() throws Exception {
        RegisteredUser owner = register("idempotencia-dono");
        RegisteredUser other = register("idempotencia-outro");
        String key = UUID.randomUUID().toString();
        String body = "{\"name\":\"Exercício idempotente\",\"primaryMuscleGroup\":\"Costas\","
                + "\"equipment\":\"Barra\",\"movementType\":\"COMPOUND\"}";

        String first = mockMvc.perform(post("/api/v1/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String firstId = objectMapper.readTree(first).path("id").asText();

        // The same key from another user is a different operation, not a replay.
        String second = mockMvc.perform(post("/api/v1/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String secondId = objectMapper.readTree(second).path("id").asText();

        assertThat(secondId).isNotEqualTo(firstId);

        // The replay of the owner still returns the resource of the owner.
        mockMvc.perform(post("/api/v1/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(firstId));
    }

    @Test
    @DisplayName("requires identity on every private endpoint")
    void requiresIdentityOnEveryPrivateEndpoint() throws Exception {
        assertUnauthenticated(get("/api/v1/programs"));
        assertUnauthenticated(post("/api/v1/programs")
                .contentType(MediaType.APPLICATION_JSON).content("{}"));
        assertUnauthenticated(get("/api/v1/workout-sessions"));
        assertUnauthenticated(post("/api/v1/workout-sessions")
                .contentType(MediaType.APPLICATION_JSON).content("{}"));
        assertUnauthenticated(get("/api/v1/records"));
        assertUnauthenticated(get("/api/v1/analytics/overview"));
        assertUnauthenticated(get("/api/v1/restrictions"));
        assertUnauthenticated(put("/api/v1/restrictions")
                .contentType(MediaType.APPLICATION_JSON).content("{\"restrictions\":[]}"));
        assertUnauthenticated(get("/api/v1/users/me"));
        assertUnauthenticated(post("/api/v1/exercises")
                .contentType(MediaType.APPLICATION_JSON).content("{}"));
        assertUnauthenticated(delete("/api/v1/sets/" + UUID.randomUUID()));
        assertUnauthenticated(post("/api/v1/ai/load-suggestions")
                .contentType(MediaType.APPLICATION_JSON).content("{}"));
    }

    private void assertUnauthenticated(MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    private String createExercise(RegisteredUser user, String name) throws Exception {
        String body = mockMvc.perform(post("/api/v1/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"primaryMuscleGroup\":\"Peito\","
                                + "\"equipment\":\"Elástico\",\"movementType\":\"ISOLATION\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("id").asText();
    }

    private Program createProgram(RegisteredUser user) throws Exception {
        String exerciseId = catalogExerciseId();
        String body = mockMvc.perform(post("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(programBody("Programa do dono", exerciseId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String programId = objectMapper.readTree(body).path("id").asText();
        String dayId = objectMapper.readTree(body).path("days").get(0).path("id").asText();
        return new Program(programId, dayId);
    }

    private ResultActions startSession(RegisteredUser user, Program program)
            throws Exception {
        String body = program == null
                ? "{\"programId\":null,\"programDayId\":null}"
                : "{\"programId\":\"" + program.id() + "\",\"programDayId\":\"" + program.dayId() + "\"}";
        return mockMvc.perform(post("/api/v1/workout-sessions")
                .header(HttpHeaders.AUTHORIZATION, bearer(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private String addExercise(RegisteredUser user, String sessionId, String exerciseId) throws Exception {
        String body = mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/exercises")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"exerciseId\":\"" + exerciseId + "\",\"position\":1}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("id").asText();
    }

    private void registerSet(RegisteredUser user, String sessionId, String sessionExerciseId, String weightKg,
            int repetitions) throws Exception {
        mockMvc.perform(post("/api/v1/workout-sessions/" + sessionId + "/sets")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .header("Idempotency-Key", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionExerciseId\":\"" + sessionExerciseId + "\",\"weightKg\":" + weightKg
                                + ",\"repetitions\":" + repetitions + "}"))
                .andExpect(status().isCreated());
    }

    private String catalogExerciseId() throws Exception {
        String body = mockMvc.perform(get("/api/v1/exercises").param("page", "0").param("size", "1"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode content = objectMapper.readTree(body).path("content");
        assertThat(content).isNotEmpty();
        return content.get(0).path("id").asText();
    }

    private List<String> idsOf(String page) throws Exception {
        JsonNode content = objectMapper.readTree(page).path("content");
        List<String> ids = new ArrayList<>();
        content.forEach(item -> ids.add(item.path("id").asText()));
        return ids;
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

    private static String programBody(String name, String exerciseId) {
        return "{\"name\":\"" + name + "\",\"description\":null,\"goal\":\"HYPERTROPHY\","
                + "\"splitType\":\"FULL_BODY\",\"days\":[{\"name\":\"Dia 1\",\"exercises\":["
                + "{\"exerciseId\":\"" + exerciseId + "\",\"targetSets\":3,\"targetRepsMin\":8,"
                + "\"targetRepsMax\":12,\"restSeconds\":90,\"notes\":null}]}]}";
    }

    private static String restrictionsBody(String userId, String bodyRegion) {
        return "{\"userId\":\"" + userId + "\",\"restrictions\":[{\"bodyRegion\":\"" + bodyRegion + "\","
                + "\"description\":\"Desconforto ao treinar\",\"isActive\":true,\"exerciseIds\":[]}]}";
    }

    private static String bearer(RegisteredUser user) {
        return "Bearer " + user.token();
    }

    private static String uniqueEmail(String prefix) {
        // The local part must stay within 64 characters: the full UUID plus the longest prefix
        // would exceed the limit enforced by the @Email constraint.
        String suffix = UUID.randomUUID().toString().substring(0, 12);
        return TEST_EMAIL_PREFIX + prefix + "-" + suffix + "@example.com";
    }

    @AfterEach
    void removeTestData() {
        jdbcTemplate.update("DELETE FROM users WHERE email LIKE ?", TEST_EMAIL_PREFIX + "%@example.com");
    }

    private record RegisteredUser(String id, String email, String token) {
    }

    private record Program(String id, String dayId) {
    }
}
