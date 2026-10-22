package com.ironmind.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.auth.entity.RefreshToken;
import com.ironmind.auth.mail.RecoveryMailSender;
import com.ironmind.auth.repository.RefreshTokenRepository;
import com.ironmind.user.entity.User;
import com.ironmind.user.repository.UserPreferencesRepository;
import com.ironmind.user.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Integration test of the authentication flow against a real PostgreSQL.
 *
 * <p>The database is provided by {@link TestDatabase}: an already running PostgreSQL when
 * {@code IT_JDBC_URL} is set, a Testcontainers instance otherwise. The test is skipped when no
 * PostgreSQL is reachable.
 *
 * <p>The test is not transactional: the idempotency of the registration depends on the commit
 * of the request, and every row is identified by an e-mail unique per execution.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuthFlowIntegrationTest {

    private static final String PASSWORD = "senha1234";

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
    private RefreshTokenRepository refreshTokenRepository;

    @MockitoBean
    private RecoveryMailSender recoveryMailSender;

    @Test
    @DisplayName("registers, logs in, renews the session and logs out")
    void registersLogsInRenewsAndLogsOut() throws Exception {
        String email = uniqueEmail("fluxo");
        String registered = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").isNumber())
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andReturn().getResponse().getContentAsString();

        JsonNode registration = objectMapper.readTree(registered);
        String userId = registration.path("user").path("id").asText();
        assertThat(userId).isNotBlank();

        String login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(userId))
                .andReturn().getResponse().getContentAsString();

        String refreshToken = objectMapper.readTree(login).path("refreshToken").asText();

        String renewal = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        String rotatedToken = objectMapper.readTree(renewal).path("refreshToken").asText();
        assertThat(rotatedToken).isNotEqualTo(refreshToken);

        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + rotatedToken + "\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + rotatedToken + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    @DisplayName("creates the account, the default preferences and the first family together")
    void createsTheAccountWithTheDefaultPreferences() throws Exception {
        String email = uniqueEmail("preferences");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isCreated());

        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(user.getPasswordHash()).startsWith("$argon2id$").doesNotContain(PASSWORD);
        assertThat(user.getRole().name()).isEqualTo("USER");
        assertThat(user.getTimezone()).isEqualTo("America/Sao_Paulo");

        assertThat(userPreferencesRepository.findByUserId(user.getId())).isPresent();
        assertThat(refreshTokenRepository.findByUserIdAndRevokedAtIsNull(user.getId())).hasSize(1);
    }

    @Test
    @DisplayName("rejects the registration of an e-mail already in use")
    void rejectsTheRegistrationOfAnEmailAlreadyInUse() throws Exception {
        String email = uniqueEmail("duplicado");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("EMAIL_ALREADY_IN_USE"));
    }

    @Test
    @DisplayName("answers the same way for a wrong password and for an unknown e-mail")
    void answersTheSameWayForAWrongPasswordAndForAnUnknownEmail() throws Exception {
        String email = uniqueEmail("credenciais");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isCreated());

        String wrongPassword = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"outra-senha1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn().getResponse().getContentAsString();

        String unknownEmail = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + uniqueEmail("inexistente") + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn().getResponse().getContentAsString();

        assertThat(objectMapper.readTree(wrongPassword).path("message"))
                .isEqualTo(objectMapper.readTree(unknownEmail).path("message"));
    }

    @Test
    @DisplayName("revokes the whole family when a refresh token is presented twice")
    void revokesTheWholeFamilyWhenARefreshTokenIsPresentedTwice() throws Exception {
        String email = uniqueEmail("reuso");
        String registration = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String firstToken = objectMapper.readTree(registration).path("refreshToken").asText();

        String renewal = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + firstToken + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String secondToken = objectMapper.readTree(renewal).path("refreshToken").asText();

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + firstToken + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));

        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        List<RefreshToken> family = refreshTokenRepository.findByUserId(user.getId());
        assertThat(family).hasSize(2);
        assertThat(family).allMatch(RefreshToken::isRevoked);

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + secondToken + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    @DisplayName("answers the recovery request the same way for a known and for an unknown e-mail")
    void answersTheRecoveryRequestTheSameWayForEveryEmail() throws Exception {
        String knownEmail = uniqueEmail("recuperacao");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(knownEmail)))
                .andExpect(status().isCreated());

        String known = mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + knownEmail + "\"}"))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();

        String unknown = mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + uniqueEmail("sem-conta") + "\"}"))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();

        assertThat(objectMapper.readTree(known).path("message"))
                .isEqualTo(objectMapper.readTree(unknown).path("message"));
        assertThat(known).doesNotContain("token");
    }

    @Test
    @DisplayName("recovers the access, consumes the token and revokes the open sessions")
    void recoversTheAccessAndRevokesTheOpenSessions() throws Exception {
        String email = uniqueEmail("senha");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isCreated());

        String login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String refreshToken = objectMapper.readTree(login).path("refreshToken").asText();

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isAccepted());

        ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
        verify(recoveryMailSender).sendPasswordReset(eq(email), token.capture());
        String resetToken = token.getValue();
        assertThat(resetToken).isNotBlank();

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + resetToken + "\",\"newPassword\":\"nova-senha1\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + resetToken + "\",\"newPassword\":\"nova-senha2\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_RESET_TOKEN"));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"nova-senha1\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("rejects the registration of a weak password")
    void rejectsTheRegistrationOfAWeakPassword() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Ana Souza\",\"email\":\"" + uniqueEmail("fraca")
                                + "\",\"password\":\"12345678\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'password')].message").isNotEmpty());
    }

    @Test
    @DisplayName("returns the same account when the registration is repeated with the same key")
    void returnsTheSameAccountWhenTheRegistrationIsRepeatedWithTheSameKey() throws Exception {
        String email = uniqueEmail("idempotente");
        String key = UUID.randomUUID().toString();

        String first = mockMvc.perform(post("/api/v1/auth/register")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String replay = mockMvc.perform(post("/api/v1/auth/register")
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerBody(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(objectMapper.readTree(replay).path("user").path("id"))
                .isEqualTo(objectMapper.readTree(first).path("user").path("id"));
        assertThat(userRepository.findAll().stream()
                .filter(user -> user.getEmail().equalsIgnoreCase(email))
                .count()).isEqualTo(1);
    }

    @Test
    @DisplayName("limits the number of recovery requests of the same e-mail")
    void limitsTheNumberOfRecoveryRequestsOfTheSameEmail() throws Exception {
        String email = uniqueEmail("taxa");

        for (int attempt = 0; attempt < 5; attempt++) {
            mockMvc.perform(post("/api/v1/auth/forgot-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"" + email + "\"}"))
                    .andExpect(status().isAccepted());
        }

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(header().exists("Retry-After"));
    }

    private static String registerBody(String email) {
        return "{\"name\":\"Ana Souza\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD
                + "\",\"timezone\":\"America/Sao_Paulo\"}";
    }

    private static String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@example.com";
    }
}
