package com.ironmind.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.ai.dto.RecommendationDecisionRequest;
import com.ironmind.ai.dto.RecommendationDecisionResponse;
import com.ironmind.ai.entity.AiRecommendation;
import com.ironmind.ai.entity.RecommendationStatus;
import com.ironmind.ai.entity.RecommendationType;
import com.ironmind.ai.repository.AiRecommendationRepository;
import com.ironmind.common.exception.ConflictException;
import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.program.repository.WorkoutProgramRepository;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persistence and review of the AI recommendations (SPEC.md section 10.13).
 *
 * <p>The row is written by the backend, never by the model, and only after the answer passed the
 * domain validation. The decision of the user is the only transition out of {@code PENDING}.
 */
@Service
public class AiRecommendationService {

    private static final TypeReference<Map<String, Object>> JSON_MAP = new TypeReference<>() {
    };
    private static final int MAX_MODEL_VERSION_LENGTH = 120;

    private final AiRecommendationRepository repository;
    private final WorkoutProgramRepository programRepository;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public AiRecommendationService(AiRecommendationRepository repository,
            WorkoutProgramRepository programRepository,
            ObjectMapper objectMapper,
            Clock clock) {
        this.repository = repository;
        this.programRepository = programRepository;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    /**
     * Stores a validated recommendation as pending.
     *
     * @param id           identifier decided before the response, so a replay can find it
     * @param userId       owner of the recommendation
     * @param type         kind of recommendation
     * @param inputSummary short summary of the input, without sensitive data
     * @param result       structured and validated output
     * @param modelVersion model that produced the output
     * @return stored recommendation
     */
    @Transactional
    public AiRecommendation record(UUID id, UUID userId, RecommendationType type, String inputSummary,
            Object result, String modelVersion) {
        Map<String, Object> payload = objectMapper.convertValue(result, JSON_MAP);
        AiRecommendation recommendation = new AiRecommendation(
                id,
                userId,
                type,
                inputSummary,
                payload,
                truncate(modelVersion),
                clock.instant());
        return repository.save(recommendation);
    }

    /**
     * Finds a recommendation that belongs to the user.
     *
     * @param userId           owner of the recommendation
     * @param recommendationId identifier of the recommendation
     * @param type             kind expected by the endpoint
     * @return stored recommendation
     * @throws ResourceNotFoundException when it does not exist, belongs to another user or has
     *                                   another type
     */
    @Transactional(readOnly = true)
    public AiRecommendation find(UUID userId, UUID recommendationId, RecommendationType type) {
        AiRecommendation recommendation = repository.findByIdAndUserId(recommendationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Recomendação não encontrada."));
        if (recommendation.getType() != type) {
            throw new ResourceNotFoundException("Recomendação não encontrada.");
        }
        return recommendation;
    }

    /**
     * Records the decision of the user about a recommendation.
     *
     * <p>The program is never created here: the user saves the reviewed proposal through the
     * program endpoints and the identifier is only linked to the recommendation.
     *
     * @param userId           owner of the recommendation
     * @param recommendationId identifier of the recommendation
     * @param request          decision of the user
     * @return state after the decision
     */
    @Transactional
    public RecommendationDecisionResponse decide(UUID userId, UUID recommendationId,
            RecommendationDecisionRequest request) {
        RecommendationStatus status = request.status();
        if (status != RecommendationStatus.ACCEPTED
                && status != RecommendationStatus.EDITED
                && status != RecommendationStatus.REJECTED) {
            throw new FieldValidationException("status",
                    "A decisão deve ser ACCEPTED, EDITED ou REJECTED.");
        }

        AiRecommendation recommendation = repository.findByIdAndUserId(recommendationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Recomendação não encontrada."));
        if (!recommendation.isPending()) {
            throw new ConflictException("Esta recomendação já foi revisada.");
        }

        UUID savedProgramId = request.programId();
        Map<String, Object> result = new LinkedHashMap<>(recommendation.getResult());
        if (savedProgramId != null) {
            if (recommendation.getType() != RecommendationType.WORKOUT_PROGRAM) {
                throw new FieldValidationException("programId",
                        "Somente propostas de treino podem ser vinculadas a um programa.");
            }
            if (!programRepository.existsByIdAndUserId(savedProgramId, userId)) {
                throw new ResourceNotFoundException("Programa não encontrado.");
            }
            result.put("savedProgramId", savedProgramId.toString());
        }

        recommendation.decide(status, clock.instant(), result);
        // Spring Data Mongo does not dirty-check the entity: the decision only reaches the
        // database when the document is saved explicitly.
        repository.save(recommendation);
        return new RecommendationDecisionResponse(
                recommendation.getId(),
                recommendation.getStatus(),
                recommendation.getAcceptedAt(),
                savedProgramId);
    }

    private static String truncate(String modelVersion) {
        if (modelVersion == null) {
            return null;
        }
        return modelVersion.length() <= MAX_MODEL_VERSION_LENGTH
                ? modelVersion
                : modelVersion.substring(0, MAX_MODEL_VERSION_LENGTH);
    }
}
