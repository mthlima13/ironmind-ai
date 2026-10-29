package com.ironmind.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.ironmind.ai.schema.VoiceInterpretationPayload;
import com.ironmind.ai.schema.WorkoutProposalPayload;
import com.ironmind.common.config.LlmProperties;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

/**
 * Provider that calls an OpenAI compatible chat completion API.
 *
 * <p>The model is always asked to answer with a JSON object, and the answer is deserialized into
 * the schema of the backend. The key never leaves this class: it is not logged, not echoed and
 * not sent to the client.
 *
 * <p>The transport limits (timeout, retries and circuit breaker) are applied by
 * {@link LlmGateway}; this class only classifies each failure as retryable or not.
 */
public class OpenAiLlmProvider implements LlmProvider {

    private static final String CHAT_COMPLETIONS_PATH = "/chat/completions";
    private static final double TEMPERATURE = 0.2;

    private static final String SYSTEM_PROMPT = """
            You are the training assistant of IronMind AI, a strength training application.
            Answer with a single JSON object and nothing else: no markdown, no prose around it.
            Use only the exercise identifiers listed in the catalog of the request. Never invent an
            identifier and never reference an exercise that is not in the catalog.
            Write every human readable field in Brazilian Portuguese.
            You are not a doctor: never diagnose an injury, never prescribe a treatment and never
            recommend substances. When the request mentions pain, advise stopping the movement that
            causes it and seeking a qualified professional.
            """;

    private static final String WORKOUT_SCHEMA_HINT = """
            The JSON object must follow this schema:
            {
              "name": "string",
              "goal": "HYPERTROPHY | STRENGTH | ENDURANCE | GENERAL",
              "splitType": "PPL | UPPER_LOWER | FULL_BODY | AB | ABC | ABCD | ABCDE | ARNOLD_SPLIT | PHUL | HYBRID_PPL_UPPER_LOWER | CUSTOM",
              "days": [
                {
                  "name": "string",
                  "exercises": [
                    {
                      "exerciseId": "uuid from the catalog",
                      "sets": 1-8,
                      "repRange": { "min": 1-30, "max": 1-30 },
                      "restSeconds": 0-600
                    }
                  ]
                }
              ],
              "explanation": "string"
            }
            When the request carries a chosen splitType, keep it and name the days after it. When it
            is null, choose the split that best fits the number of training days and report it.
            """;

    private static final String VOICE_SCHEMA_HINT = """
            The JSON object must follow this schema:
            {
              "sets": [
                {
                  "setNumber": 1,
                  "weightKg": number or null,
                  "repetitions": number or null,
                  "durationSeconds": number or null,
                  "distanceMeters": number or null
                }
              ],
              "notes": "string"
            }
            """;

    private final LlmProperties properties;
    private final ObjectMapper objectMapper;
    private final RestClient client;

    public OpenAiLlmProvider(LlmProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;

        int timeout = (int) Math.min(properties.timeoutMs(), Integer.MAX_VALUE);
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeout);
        requestFactory.setReadTimeout(timeout);

        this.client = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + properties.apiKey())
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public String modelName() {
        return properties.model();
    }

    @Override
    public WorkoutProposalPayload proposeWorkout(AiContext context, String request) {
        Map<String, Object> prompt = new LinkedHashMap<>();
        prompt.put("request", safe(request));
        prompt.put("goal", context.goal());
        prompt.put("experience", context.experience());
        prompt.put("trainingDays", context.trainingDays());
        prompt.put("splitType", context.splitType() == null ? null : context.splitType().name());
        prompt.put("availableEquipment", context.availableEquipment());
        prompt.put("restrictionBodyRegions", context.restrictionRegions());
        prompt.put("catalog", context.catalog());
        String userPrompt = toJson(prompt);
        String content = complete(SYSTEM_PROMPT + WORKOUT_SCHEMA_HINT, userPrompt);
        return parse(content, WorkoutProposalPayload.class);
    }

    @Override
    public String coach(AiContext context, String historySummary, String message) {
        String userPrompt = toJson(Map.of(
                "message", safe(message),
                "historySummary", safe(historySummary),
                "goal", context.goal(),
                "experience", context.experience(),
                "trainingDays", context.trainingDays(),
                "availableEquipment", context.availableEquipment(),
                "restrictionBodyRegions", context.restrictionRegions()));
        String content = complete(SYSTEM_PROMPT
                + "Answer in at most 120 words, in Brazilian Portuguese, with a single JSON object "
                + "of the shape {\"reply\": \"string\"}.", userPrompt);
        return readReply(content);
    }

    @Override
    public VoiceInterpretationPayload interpretVoice(String transcript) {
        String userPrompt = toJson(Map.of("transcript", safe(transcript)));
        String content = complete(SYSTEM_PROMPT + VOICE_SCHEMA_HINT, userPrompt);
        return parse(content, VoiceInterpretationPayload.class);
    }

    private String complete(String systemPrompt, String userPrompt) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.model());
        body.put("temperature", TEMPERATURE);
        body.put("max_tokens", properties.maxOutputTokens());
        body.put("response_format", Map.of("type", "json_object"));
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)));

        String raw;
        try {
            raw = client.post()
                    .uri(CHAT_COMPLETIONS_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
        } catch (RestClientResponseException exception) {
            int status = exception.getStatusCode().value();
            boolean retryable = status == 408 || status == 429 || status >= 500;
            throw new LlmTransportException("Provider answered with status " + status, retryable);
        } catch (ResourceAccessException exception) {
            throw new LlmTransportException("Provider did not answer within the timeout", true, exception);
        } catch (RestClientException exception) {
            throw new LlmTransportException("Provider could not be reached", true, exception);
        }

        return readContent(raw);
    }

    private String readReply(String content) {
        try {
            JsonNode reply = objectMapper.readTree(content).get("reply");
            if (reply == null || reply.isNull() || reply.asText().isBlank()) {
                throw new LlmSchemaException("The provider answered without a reply.");
            }
            return reply.asText().strip();
        } catch (JsonProcessingException exception) {
            throw new LlmSchemaException("The provider answered outside of the expected schema.", exception);
        }
    }

    private String readContent(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new LlmSchemaException("The provider answered with an empty body.");
        }
        try {
            JsonNode root = objectMapper.readTree(raw);
            JsonNode content = root.at("/choices/0/message/content");
            if (content.isMissingNode() || content.isNull() || content.asText().isBlank()) {
                throw new LlmSchemaException("The provider answered without content.");
            }
            return content.asText();
        } catch (JsonProcessingException exception) {
            throw new LlmSchemaException("The provider answered outside of the expected schema.", exception);
        }
    }

    private <T> T parse(String content, Class<T> type) {
        if (content == null || content.isBlank()) {
            throw new LlmSchemaException("The provider answered with an empty payload.");
        }
        try {
            return objectMapper.readValue(content, type);
        } catch (JsonProcessingException exception) {
            throw new LlmSchemaException("The provider answered outside of the expected schema.", exception);
        }
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new LlmSchemaException("The context could not be serialized.", exception);
        }
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }
}
