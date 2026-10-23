package com.ironmind.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.ai.dto.ProposedDayResponse;
import com.ironmind.ai.dto.ProposedExerciseResponse;
import com.ironmind.ai.dto.WorkoutProposalRequest;
import com.ironmind.ai.dto.WorkoutProposalResponse;
import com.ironmind.ai.entity.AiRecommendation;
import com.ironmind.ai.entity.RecommendationStatus;
import com.ironmind.ai.entity.RecommendationType;
import com.ironmind.ai.provider.AiContext;
import com.ironmind.ai.provider.LlmGateway;
import com.ironmind.ai.schema.WorkoutProposalPayload;
import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.common.idempotency.IdempotencyService;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Generation of workout proposals (SPEC.md section 12.2).
 *
 * <p>The flow is fixed: the backend builds the context, the model proposes, the backend validates
 * and the user reviews. The proposal is stored as a pending recommendation, never as a program.
 *
 * <p>The whole validated answer is stored in {@code result_json}, so a request replayed with the
 * same {@code Idempotency-Key} returns the original proposal without calling the model again.
 */
@Service
public class WorkoutProposalService {

    /**
     * Visible notice that accompanies every proposal.
     */
    public static final String DISCLAIMER =
            "Sugestão informativa gerada por IA. Revise exercícios, séries e cargas antes de salvar.";

    private static final String IDEMPOTENCY_SCOPE = "ai.workout-proposals";

    private final AiContextBuilder contextBuilder;
    private final LlmGateway gateway;
    private final WorkoutProposalValidator validator;
    private final AiRecommendationService recommendationService;
    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    public WorkoutProposalService(AiContextBuilder contextBuilder,
            LlmGateway gateway,
            WorkoutProposalValidator validator,
            AiRecommendationService recommendationService,
            IdempotencyService idempotencyService,
            ObjectMapper objectMapper) {
        this.contextBuilder = contextBuilder;
        this.gateway = gateway;
        this.validator = validator;
        this.recommendationService = recommendationService;
        this.idempotencyService = idempotencyService;
        this.objectMapper = objectMapper;
    }

    /**
     * Proposes a workout program to the user.
     *
     * @param userId         owner of the proposal, taken from the access token
     * @param request        request written by the user
     * @param idempotencyKey key of the request, {@code null} when absent
     * @return validated proposal waiting for the review
     */
    public WorkoutProposalResponse propose(UUID userId, WorkoutProposalRequest request,
            String idempotencyKey) {
        String fingerprint = IdempotencyService.fingerprint(request.toString());
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<UUID> existing = idempotencyService.findExistingResource(
                    IDEMPOTENCY_SCOPE, idempotencyKey, userId, fingerprint);
            if (existing.isPresent()) {
                return replay(userId, existing.get());
            }
        }

        AiContext context = contextBuilder.build(userId, request.trainingDays(), request.goal());
        if (context.catalog().isEmpty()) {
            throw new FieldValidationException("availableEquipment",
                    "Nenhum exercício do catálogo é compatível com as suas preferências. "
                            + "Atualize os equipamentos disponíveis.");
        }

        WorkoutProposalPayload payload = gateway.proposeWorkout(context, request.prompt().strip());
        ValidatedWorkoutProposal validated = validator.validate(payload, context);

        List<String> warnings = new ArrayList<>(validated.warnings());
        if (!context.hasEquipmentInformation()) {
            warnings.add("Equipamento não informado: a proposta pode incluir exercícios que você não "
                    + "tem. Atualize as preferências para melhorar as próximas sugestões.");
        }
        if (!context.restrictionRegions().isEmpty()) {
            warnings.add("Restrições ativas consideradas: " + String.join(", ", context.restrictionRegions())
                    + ". Revise os exercícios antes de salvar.");
        }

        UUID recommendationId = UUID.randomUUID();
        WorkoutProposalResponse response = new WorkoutProposalResponse(
                recommendationId,
                RecommendationStatus.PENDING,
                gateway.modelName(),
                validated.name(),
                validated.goal(),
                toResponse(validated.days()),
                validated.explanation(),
                List.copyOf(warnings),
                DISCLAIMER);

        int exercises = validated.days().stream().mapToInt(day -> day.exercises().size()).sum();
        String summary = "goal=" + validated.goal()
                + ";trainingDays=" + validated.days().size()
                + ";exercises=" + exercises
                + ";restrictions=" + context.restrictionRegions().size()
                + ";equipmentInformed=" + context.hasEquipmentInformation();
        recommendationService.record(
                recommendationId,
                userId,
                RecommendationType.WORKOUT_PROGRAM,
                summary,
                response,
                gateway.modelName());

        idempotencyService.rememberAfterCommit(
                IDEMPOTENCY_SCOPE, idempotencyKey, userId, fingerprint, recommendationId);
        return response;
    }

    /**
     * Rebuilds the answer of a request replayed with the same idempotency key.
     *
     * @param userId           owner of the recommendation
     * @param recommendationId identifier stored with the key
     * @return original proposal, with the current lifecycle status
     */
    public WorkoutProposalResponse replay(UUID userId, UUID recommendationId) {
        AiRecommendation recommendation = recommendationService.find(
                userId, recommendationId, RecommendationType.WORKOUT_PROGRAM);
        WorkoutProposalResponse stored = objectMapper.convertValue(
                recommendation.getResult(), WorkoutProposalResponse.class);
        return new WorkoutProposalResponse(
                recommendation.getId(),
                recommendation.getStatus(),
                stored.model(),
                stored.name(),
                stored.goal(),
                stored.days(),
                stored.explanation(),
                stored.warnings(),
                stored.disclaimer());
    }

    private static List<ProposedDayResponse> toResponse(List<ValidatedWorkoutProposal.Day> days) {
        return days.stream()
                .map(day -> new ProposedDayResponse(
                        day.name(),
                        day.exercises().stream()
                                .map(exercise -> new ProposedExerciseResponse(
                                        exercise.exerciseId(),
                                        exercise.name(),
                                        exercise.primaryMuscleGroup(),
                                        exercise.sets(),
                                        exercise.repsMin(),
                                        exercise.repsMax(),
                                        exercise.restSeconds()))
                                .toList()))
                .toList();
    }
}
