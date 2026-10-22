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
 * Integration test of the program endpoints against a real PostgreSQL.
 *
 * <p>The database is provided by {@link TestDatabase}: an already running PostgreSQL when
 * {@code IT_JDBC_URL} is set, a Testcontainers instance otherwise. The test is skipped when no
 * PostgreSQL is reachable.
 *
 * <p>The test is not transactional and every account uses an e-mail unique per execution, so the
 * residual data of a previous run cannot collide with the unique constraint of {@code users}. The
 * cleanup removes the accounts, and the cascade of the database removes their programs.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProgramIntegrationTest {

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
    @DisplayName("lists only the programs of the authenticated user")
    void listsOnlyTheProgramsOfTheAuthenticatedUser() throws Exception {
        RegisteredUser owner = register("programas-dono");
        RegisteredUser other = register("programas-invasor");
        String exerciseId = catalogExerciseId();

        String ownerProgram = createProgram(owner.token(), "Programa do dono", exerciseId);
        createProgram(other.token(), "Programa do outro", exerciseId);

        mockMvc.perform(get("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.content[0].id").value(ownerProgram))
                .andExpect(jsonPath("$.content[0].name").value("Programa do dono"));
    }

    @Test
    @DisplayName("returns exactly the structure sent in the creation")
    void returnsExactlyTheStructureSentInTheCreation() throws Exception {
        RegisteredUser user = register("programas-criacao");
        String exerciseId = catalogExerciseId();

        String created = mockMvc.perform(post("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(programBody("Push / Pull / Legs", exerciseId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Push / Pull / Legs"))
                .andExpect(jsonPath("$.description").value("Divisão de 3 dias"))
                .andExpect(jsonPath("$.goal").value("HYPERTROPHY"))
                .andExpect(jsonPath("$.splitType").value("PPL"))
                .andExpect(jsonPath("$.isArchived").value(false))
                .andExpect(jsonPath("$.days.length()").value(2))
                .andExpect(jsonPath("$.days[0].position").value(1))
                .andExpect(jsonPath("$.days[0].name").value("Peito e tríceps"))
                .andExpect(jsonPath("$.days[0].exercises[0].exerciseId").value(exerciseId))
                .andExpect(jsonPath("$.days[0].exercises[0].position").value(1))
                .andExpect(jsonPath("$.days[0].exercises[0].targetSets").value(4))
                .andExpect(jsonPath("$.days[0].exercises[0].targetRepsMin").value(6))
                .andExpect(jsonPath("$.days[0].exercises[0].targetRepsMax").value(8))
                .andExpect(jsonPath("$.days[0].exercises[0].restSeconds").value(150))
                .andExpect(jsonPath("$.days[0].exercises[0].exercise.id").value(exerciseId))
                .andExpect(jsonPath("$.days[0].exercises[0].exercise.name").isNotEmpty())
                .andExpect(jsonPath("$.days[1].position").value(2))
                .andReturn().getResponse().getContentAsString();

        String programId = objectMapper.readTree(created).path("id").asText();
        assertThat(programId).isNotBlank();

        mockMvc.perform(get("/api/v1/programs/" + programId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(programId))
                .andExpect(jsonPath("$.days.length()").value(2))
                .andExpect(jsonPath("$.days[0].exercises.length()").value(2))
                .andExpect(jsonPath("$.days[0].exercises[1].position").value(2))
                .andExpect(jsonPath("$.days[1].exercises.length()").value(1))
                .andExpect(jsonPath("$.days[1].exercises[0].exerciseId").value(exerciseId));
    }

    @Test
    @DisplayName("replaces the structure of the program on update")
    void replacesTheStructureOfTheProgramOnUpdate() throws Exception {
        RegisteredUser user = register("programas-atualizacao");
        String exerciseId = catalogExerciseId();
        String programId = createProgram(user.token(), "Programa original", exerciseId);

        mockMvc.perform(put("/api/v1/programs/" + programId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Programa novo\",\"description\":\"Estrutura nova\","
                                + "\"goal\":\"STRENGTH\",\"splitType\":\"CUSTOM\",\"days\":[{\"name\":\"Costas\","
                                + "\"exercises\":[{\"exerciseId\":\"" + exerciseId + "\",\"targetSets\":3,"
                                + "\"targetRepsMin\":8,\"targetRepsMax\":12,\"restSeconds\":120,\"notes\":null}]}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Programa novo"))
                .andExpect(jsonPath("$.goal").value("STRENGTH"))
                .andExpect(jsonPath("$.splitType").value("CUSTOM"))
                .andExpect(jsonPath("$.days.length()").value(1))
                .andExpect(jsonPath("$.days[0].name").value("Costas"))
                .andExpect(jsonPath("$.days[0].position").value(1))
                .andExpect(jsonPath("$.days[0].exercises.length()").value(1));

        mockMvc.perform(get("/api/v1/programs/" + programId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days.length()").value(1))
                .andExpect(jsonPath("$.days[0].name").value("Costas"));

        Integer storedDays = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM program_days WHERE program_id = ?", Integer.class, UUID.fromString(programId));
        assertThat(storedDays).isEqualTo(1);
    }

    @Test
    @DisplayName("never answers the program of another user")
    void neverAnswersTheProgramOfAnotherUser() throws Exception {
        RegisteredUser owner = register("programas-acesso-dono");
        RegisteredUser other = register("programas-acesso-invasor");
        String exerciseId = catalogExerciseId();
        String programId = createProgram(owner.token(), "Programa privado", exerciseId);

        mockMvc.perform(get("/api/v1/programs/" + programId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(put("/api/v1/programs/" + programId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(programBody("Programa roubado", exerciseId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(delete("/api/v1/programs/" + programId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        mockMvc.perform(get("/api/v1/programs/" + programId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Programa privado"));
    }

    @Test
    @DisplayName("answers unauthorized without a token")
    void answersUnauthorizedWithoutAToken() throws Exception {
        mockMvc.perform(get("/api/v1/programs"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));

        mockMvc.perform(post("/api/v1/programs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(programBody("Sem token", catalogExerciseId())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
    }

    @Test
    @DisplayName("archives the program and keeps it reachable by its identifier")
    void archivesTheProgramAndKeepsItReachableByItsIdentifier() throws Exception {
        RegisteredUser user = register("programas-arquivar");
        String exerciseId = catalogExerciseId();
        String programId = createProgram(user.token(), "Programa arquivado", exerciseId);

        mockMvc.perform(delete("/api/v1/programs/" + programId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.content").isEmpty());

        mockMvc.perform(get("/api/v1/programs/" + programId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(programId))
                .andExpect(jsonPath("$.isArchived").value(true));

        mockMvc.perform(get("/api/v1/programs").param("includeArchived", "true")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(programId));

        Boolean archived = jdbcTemplate.queryForObject(
                "SELECT is_archived FROM workout_programs WHERE id = ?", Boolean.class, UUID.fromString(programId));
        assertThat(archived).isTrue();
    }

    @Test
    @DisplayName("returns the same program when the idempotency key is replayed")
    void returnsTheSameProgramWhenTheIdempotencyKeyIsReplayed() throws Exception {
        RegisteredUser user = register("programas-idempotencia");
        String exerciseId = catalogExerciseId();
        String key = UUID.randomUUID().toString();
        String body = programBody("Programa idempotente", exerciseId);

        String first = mockMvc.perform(post("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String second = mockMvc.perform(post("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(objectMapper.readTree(second).path("id").asText())
                .isEqualTo(objectMapper.readTree(first).path("id").asText());

        mockMvc.perform(get("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    @DisplayName("refuses a page size above the limit")
    void refusesAPageSizeAboveTheLimit() throws Exception {
        RegisteredUser user = register("programas-pagina");

        mockMvc.perform(get("/api/v1/programs").param("size", "101")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("refuses an exercise that does not exist in the catalog")
    void refusesAnExerciseThatDoesNotExistInTheCatalog() throws Exception {
        RegisteredUser user = register("programas-exercicio");
        String missingExerciseId = UUID.randomUUID().toString();

        mockMvc.perform(post("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(programBody("Programa inválido", missingExerciseId)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("days[0].exercises[0].exerciseId"))
                .andExpect(jsonPath("$.fieldErrors[0].message").isNotEmpty());
    }

    @Test
    @DisplayName("refuses a repetition range that ends before it starts")
    void refusesARepetitionRangeThatEndsBeforeItStarts() throws Exception {
        RegisteredUser user = register("programas-repeticoes");
        String exerciseId = catalogExerciseId();

        mockMvc.perform(post("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, bearer(user))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Faixa inválida\",\"description\":null,\"goal\":\"HYPERTROPHY\","
                                + "\"splitType\":\"PPL\",\"days\":[{\"name\":\"Peito\",\"exercises\":[{\"exerciseId\":\""
                                + exerciseId + "\",\"targetSets\":3,\"targetRepsMin\":12,\"targetRepsMax\":8,"
                                + "\"restSeconds\":120,\"notes\":null}]}]}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("days[0].exercises[0].targetRepsMax"));
    }

    private String createProgram(String token, String name, String exerciseId) throws Exception {
        String created = mockMvc.perform(post("/api/v1/programs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(programBody(name, exerciseId)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(created).path("id").asText();
    }

    private static String programBody(String name, String exerciseId) {
        return "{\"name\":\"" + name + "\",\"description\":\"Divisão de 3 dias\",\"goal\":\"HYPERTROPHY\","
                + "\"splitType\":\"PPL\",\"days\":[{\"name\":\"Peito e tríceps\",\"exercises\":["
                + "{\"exerciseId\":\"" + exerciseId + "\",\"targetSets\":4,\"targetRepsMin\":6,\"targetRepsMax\":8,"
                + "\"restSeconds\":150,\"notes\":null},"
                + "{\"exerciseId\":\"" + exerciseId + "\",\"targetSets\":3,\"targetRepsMin\":8,\"targetRepsMax\":12,"
                + "\"restSeconds\":120,\"notes\":null}]},"
                + "{\"name\":\"Costas\",\"exercises\":["
                + "{\"exerciseId\":\"" + exerciseId + "\",\"targetSets\":4,\"targetRepsMin\":8,\"targetRepsMax\":12,"
                + "\"restSeconds\":120,\"notes\":null}]}]}";
    }

    private String catalogExerciseId() throws Exception {
        String body = mockMvc.perform(get("/api/v1/exercises").param("page", "0").param("size", "1"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode content = objectMapper.readTree(body).path("content");
        assertThat(content.isArray()).isTrue();
        assertThat(content).isNotEmpty();
        return content.get(0).path("id").asText();
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
     * of the test transaction. Deleting the account cascades to its programs, days and exercises.
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
