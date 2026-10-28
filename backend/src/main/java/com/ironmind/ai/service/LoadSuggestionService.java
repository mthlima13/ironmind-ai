package com.ironmind.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.ai.config.AiProperties;
import com.ironmind.ai.dto.LoadSuggestionRequest;
import com.ironmind.ai.dto.LoadSuggestionResponse;
import com.ironmind.ai.dto.SuggestedSetResponse;
import com.ironmind.ai.entity.AiRecommendation;
import com.ironmind.ai.entity.RecommendationStatus;
import com.ironmind.ai.entity.RecommendationType;
import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.common.idempotency.IdempotencyService;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.user.entity.InjuryRestriction;
import com.ironmind.user.repository.InjuryRestrictionRepository;
import com.ironmind.workout.entity.ExerciseSet;
import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import com.ironmind.workout.repository.ExerciseSetRepository;
import com.ironmind.workout.repository.WorkoutSessionRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Rule based load suggestion (SPEC.md section 12.3).
 *
 * <p>Rules come before any model: the suggestion is derived from the recorded sets, is
 * conservative and explains its origin. The load is only increased when the user completed the
 * top of the repetition range in the last two sessions, with a perceived effort of at most 8 and
 * at least three sessions of history; a missing effort reading never increases the load.
 *
 * <p>Nothing is applied automatically: the values only pre-fill the set form.
 */
@Service
public class LoadSuggestionService {

    /**
     * Visible notice that accompanies every suggestion.
     */
    public static final String DISCLAIMER =
            "Sugestão informativa baseada no seu histórico. Ajuste-a conforme a sua percepção de "
                    + "esforço e a orientação de um profissional.";

    /**
     * Version of the rules recorded with the recommendation.
     */
    public static final String MODEL_VERSION = "rules-v1";

    private static final String IDEMPOTENCY_SCOPE = "ai.load-suggestions";

    private static final int MAX_SESSIONS_CONSIDERED = 3;
    private static final int CONSERVATIVE_RPE_LIMIT = 8;
    private static final int HIGH_RPE = 9;
    private static final BigDecimal HEAVY_STEP = new BigDecimal("2.5");
    private static final BigDecimal LIGHT_STEP = new BigDecimal("1.0");
    private static final BigDecimal HEAVY_LOAD_THRESHOLD = new BigDecimal("20");

    private final ExerciseRepository exerciseRepository;
    private final InjuryRestrictionRepository restrictionRepository;
    private final ExerciseSetRepository setRepository;
    private final WorkoutSessionRepository sessionRepository;
    private final AiRecommendationService recommendationService;
    private final AiProperties properties;
    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    public LoadSuggestionService(ExerciseRepository exerciseRepository,
            InjuryRestrictionRepository restrictionRepository,
            ExerciseSetRepository setRepository,
            WorkoutSessionRepository sessionRepository,
            AiRecommendationService recommendationService,
            AiProperties properties,
            IdempotencyService idempotencyService,
            ObjectMapper objectMapper) {
        this.exerciseRepository = exerciseRepository;
        this.restrictionRepository = restrictionRepository;
        this.setRepository = setRepository;
        this.sessionRepository = sessionRepository;
        this.recommendationService = recommendationService;
        this.properties = properties;
        this.idempotencyService = idempotencyService;
        this.objectMapper = objectMapper;
    }

    /**
     * Suggests load and repetitions for an exercise.
     *
     * @param userId         owner of the history, taken from the identity header
     * @param request        exercise and target range
     * @param idempotencyKey key of the request, {@code null} when absent
     * @return conservative suggestion with its origin
     */
    public LoadSuggestionResponse suggest(UUID userId, LoadSuggestionRequest request,
            String idempotencyKey) {
        String fingerprint = IdempotencyService.fingerprint(request.toString());
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<UUID> existing = idempotencyService.findExistingResource(
                    IDEMPOTENCY_SCOPE, idempotencyKey, userId, fingerprint);
            if (existing.isPresent()) {
                return replay(userId, existing.get());
            }
        }

        AiProperties.Limits limits = properties.limits();
        int targetMin = request.targetRepsMin() == null
                ? limits.defaultRepsMin()
                : request.targetRepsMin();
        int targetMax = request.targetRepsMax() == null
                ? Math.max(targetMin, limits.defaultRepsMax())
                : request.targetRepsMax();
        if (targetMax < targetMin) {
            throw new FieldValidationException("targetRepsMax",
                    "O topo da faixa deve ser maior ou igual ao início.");
        }
        targetMax = Math.min(targetMax, limits.maxReps());
        targetMin = Math.min(targetMin, targetMax);

        Exercise exercise = exerciseRepository.findById(request.exerciseId())
                .filter(candidate -> candidate.isVisibleTo(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Exercício não encontrado."));
        if (isBlockedByActiveRestriction(userId, exercise.getId())) {
            throw new FieldValidationException("exerciseId",
                    "Este exercício está bloqueado por uma restrição ativa.");
        }

        List<ExerciseSet> history = setRepository
                .findByUserIdAndExerciseIdOrderByCompletedAtAscIdAsc(userId, exercise.getId());
        Map<UUID, WorkoutSession> sessionsById = sessionsOf(history);
        List<ExerciseSet> completedSets = history.stream()
                .filter(set -> {
                    WorkoutSession session = sessionsById.get(set.getSessionId());
                    return session != null && session.getStatus() == SessionStatus.COMPLETED;
                })
                .toList();

        List<List<ExerciseSet>> sessions = groupBySession(completedSets);
        LoadSuggestionResponse response;
        String summary;
        if (sessions.isEmpty()) {
            response = insufficientHistory(exercise);
            summary = "exerciseId=" + exercise.getId() + ";rule=INSUFFICIENT_HISTORY;sessions=0";
        } else {
            List<List<ExerciseSet>> considered = sessions.size() > MAX_SESSIONS_CONSIDERED
                    ? sessions.subList(sessions.size() - MAX_SESSIONS_CONSIDERED, sessions.size())
                    : sessions;
            List<ExerciseSet> lastSession = considered.get(considered.size() - 1);

            Analysis analysis = analyse(considered, lastSession, targetMin, targetMax, limits);
            Instant lastPerformedAt = lastPerformed(lastSession, sessionsById);

            response = new LoadSuggestionResponse(
                    UUID.randomUUID(),
                    RecommendationStatus.PENDING,
                    exercise.getId(),
                    exercise.getName(),
                    analysis.sets(),
                    analysis.rule(),
                    analysis.confidence(),
                    analysis.explanation(),
                    considered.size(),
                    lastPerformedAt,
                    analysis.warnings(),
                    DISCLAIMER,
                    false);
            summary = "exerciseId=" + exercise.getId()
                    + ";rule=" + analysis.rule()
                    + ";sessions=" + considered.size();
        }

        recommendationService.record(
                response.recommendationId(),
                userId,
                RecommendationType.LOAD_SUGGESTION,
                summary,
                response,
                MODEL_VERSION);
        idempotencyService.rememberAfterCommit(
                IDEMPOTENCY_SCOPE, idempotencyKey, userId, fingerprint, response.recommendationId());
        return response;
    }

    /**
     * Rebuilds the answer of a request replayed with the same idempotency key.
     *
     * @param userId           owner of the recommendation
     * @param recommendationId identifier stored with the key
     * @return original suggestion, with the current lifecycle status
     */
    public LoadSuggestionResponse replay(UUID userId, UUID recommendationId) {
        AiRecommendation recommendation = recommendationService.find(
                userId, recommendationId, RecommendationType.LOAD_SUGGESTION);
        LoadSuggestionResponse stored = objectMapper.convertValue(
                recommendation.getResult(), LoadSuggestionResponse.class);
        return new LoadSuggestionResponse(
                recommendation.getId(),
                recommendation.getStatus(),
                stored.exerciseId(),
                stored.exerciseName(),
                stored.sets(),
                stored.rule(),
                stored.confidence(),
                stored.explanation(),
                stored.sessionsConsidered(),
                stored.lastPerformedAt(),
                stored.warnings(),
                stored.disclaimer(),
                stored.applied());
    }

    private LoadSuggestionResponse insufficientHistory(Exercise exercise) {
        String rule = "INSUFFICIENT_HISTORY";
        String explanation = "Ainda não há séries concluídas deste exercício no seu histórico. "
                + "Registre uma sessão para receber uma sugestão baseada em dados reais.";
        List<String> warnings = List.of("Sem histórico suficiente, nenhuma carga é sugerida.");

        return new LoadSuggestionResponse(
                UUID.randomUUID(),
                RecommendationStatus.PENDING,
                exercise.getId(),
                exercise.getName(),
                List.of(),
                rule,
                "LOW",
                explanation,
                0,
                null,
                warnings,
                DISCLAIMER,
                false);
    }

    private Analysis analyse(List<List<ExerciseSet>> considered, List<ExerciseSet> lastSession,
            int targetMin, int targetMax, AiProperties.Limits limits) {
        List<String> warnings = new ArrayList<>();
        ExerciseSet best = bestSet(lastSession);
        BigDecimal lastWeight = best.getWeightKg();
        int setCount = Math.max(1, Math.min(limits.maxSets(), lastSession.size()));

        boolean enoughSessions = considered.size() >= MAX_SESSIONS_CONSIDERED;
        boolean topReached = reachedTopInLastTwo(considered, targetMax);
        boolean effortControlled = effortControlled(considered);
        boolean highEffort = lastSession.stream()
                .anyMatch(set -> set.getPerceivedExertion() != null
                        && set.getPerceivedExertion() >= HIGH_RPE);
        boolean belowMinimum = best.getRepetitions() < targetMin;

        if (!effortControlled) {
            warnings.add("Registre o esforço percebido (RPE) em todas as séries para permitir um "
                    + "aumento de carga com mais segurança.");
        }

        if (lastWeight == null) {
            return new Analysis(
                    "KEEP_LAST_LOAD",
                    enoughSessions ? "MEDIUM" : "LOW",
                    mirror(lastSession, setCount, limits),
                    "O exercício não tem carga externa registrada na última sessão. A sugestão repete "
                            + "as repetições; progrida em repetições ou em variação do movimento.",
                    warnings);
        }

        if (highEffort || belowMinimum) {
            BigDecimal reduced = step(lastWeight, true);
            if (reduced == null) {
                warnings.add("A carga já era a mínima; reduza as repetições ou revise a técnica.");
            }
            String reason = highEffort
                    ? "O esforço percebido da última sessão chegou a " + HIGH_RPE + " ou mais, acima do "
                            + "limite conservador de " + CONSERVATIVE_RPE_LIMIT + "."
                    : "A última sessão ficou abaixo do mínimo de " + targetMin + " repetições.";
            String explanation = reason + " A sugestão reduz a carga em "
                    + format(stepSize(lastWeight)) + " kg (de " + format(lastWeight) + " kg para "
                    + (reduced == null ? "sem carga externa" : format(reduced) + " kg") + ").";
            return new Analysis("REDUCE_LOAD", "MEDIUM",
                    uniform(setCount, reduced, targetMin), explanation, warnings);
        }

        if (enoughSessions && topReached && effortControlled) {
            BigDecimal increased = step(lastWeight, false);
            String explanation = "Você completou o topo da faixa (" + targetMax + " repetições) nas duas "
                    + "últimas sessões, com esforço percebido de até " + CONSERVATIVE_RPE_LIMIT
                    + ", e tem pelo menos " + MAX_SESSIONS_CONSIDERED + " sessões registradas. "
                    + "A sugestão aumenta a carga em " + format(stepSize(lastWeight)) + " kg (de "
                    + format(lastWeight) + " kg para " + format(increased) + " kg).";
            return new Analysis("INCREASE_LOAD", "HIGH",
                    uniform(setCount, increased, targetMin), explanation, warnings);
        }

        String explanation;
        if (!enoughSessions) {
            explanation = "Ainda não há " + MAX_SESSIONS_CONSIDERED + " sessões concluídas deste exercício. "
                    + "A sugestão repete a carga e as repetições da última sessão.";
        } else if (!topReached) {
            explanation = "Você ainda não completou o topo da faixa (" + targetMax + " repetições) nas "
                    + "duas últimas sessões. A sugestão repete a carga da última sessão.";
        } else {
            explanation = "O esforço percebido (RPE) não foi registrado em todas as séries, então não "
                    + "aumentamos a carga. A sugestão repete a última sessão.";
        }
        return new Analysis("KEEP_LAST_LOAD", enoughSessions ? "MEDIUM" : "LOW",
                mirror(lastSession, setCount, limits), explanation, warnings);
    }

    private static boolean reachedTopInLastTwo(List<List<ExerciseSet>> considered, int targetMax) {
        if (considered.size() < 2) {
            return false;
        }
        List<List<ExerciseSet>> lastTwo = considered.subList(considered.size() - 2, considered.size());
        return lastTwo.stream().allMatch(sets ->
                sets.stream().anyMatch(set -> set.getRepetitions() >= targetMax));
    }

    private static boolean effortControlled(List<List<ExerciseSet>> considered) {
        boolean anyReading = false;
        for (List<ExerciseSet> sets : considered) {
            for (ExerciseSet set : sets) {
                if (set.getPerceivedExertion() == null) {
                    return false;
                }
                anyReading = true;
                if (set.getPerceivedExertion() > CONSERVATIVE_RPE_LIMIT) {
                    return false;
                }
            }
        }
        return anyReading;
    }

    private static List<List<ExerciseSet>> groupBySession(List<ExerciseSet> history) {
        Map<UUID, List<ExerciseSet>> bySession = new LinkedHashMap<>();
        for (ExerciseSet set : history) {
            bySession.computeIfAbsent(set.getSessionId(),
                    key -> new ArrayList<>()).add(set);
        }
        List<List<ExerciseSet>> sessions = new ArrayList<>();
        for (List<ExerciseSet> sets : bySession.values()) {
            sets.sort(Comparator.comparingInt(ExerciseSet::getSetNumber));
            sessions.add(sets);
        }
        return sessions;
    }

    /**
     * Loads the sessions of the history in a single round trip.
     */
    private Map<UUID, WorkoutSession> sessionsOf(List<ExerciseSet> history) {
        List<UUID> sessionIds = history.stream().map(ExerciseSet::getSessionId).distinct().toList();
        Map<UUID, WorkoutSession> sessions = new HashMap<>();
        for (WorkoutSession session : sessionRepository.findAllById(sessionIds)) {
            sessions.put(session.getId(), session);
        }
        return sessions;
    }

    private static ExerciseSet bestSet(List<ExerciseSet> session) {
        return session.stream()
                .max(Comparator
                        .comparing((ExerciseSet set) -> set.getWeightKg() == null
                                ? BigDecimal.valueOf(-1)
                                : set.getWeightKg())
                        .thenComparingInt(ExerciseSet::getRepetitions))
                .orElseThrow();
    }

    private static Instant lastPerformed(List<ExerciseSet> session, Map<UUID, WorkoutSession> sessionsById) {
        WorkoutSession owner = sessionsById.get(session.get(0).getSessionId());
        Instant completedAt = owner == null ? null : owner.getCompletedAt();
        if (completedAt != null) {
            return completedAt;
        }
        return session.get(session.size() - 1).getCompletedAt();
    }

    private static List<SuggestedSetResponse> mirror(List<ExerciseSet> session, int setCount,
            AiProperties.Limits limits) {
        List<SuggestedSetResponse> sets = new ArrayList<>();
        for (int index = 0; index < setCount; index++) {
            ExerciseSet set = session.get(index);
            int repetitions = Math.max(AiProperties.Limits.MIN_REPS,
                    Math.min(limits.maxReps(), set.getRepetitions()));
            sets.add(new SuggestedSetResponse(
                    index + 1,
                    set.getWeightKg(),
                    repetitions,
                    set.getDurationSeconds(),
                    set.getDistanceMeters()));
        }
        return sets;
    }

    private static List<SuggestedSetResponse> uniform(int setCount, BigDecimal weight, int repetitions) {
        List<SuggestedSetResponse> sets = new ArrayList<>();
        for (int index = 0; index < setCount; index++) {
            sets.add(new SuggestedSetResponse(index + 1, weight, repetitions, null, null));
        }
        return sets;
    }

    private static BigDecimal step(BigDecimal load, boolean decrease) {
        BigDecimal stepSize = stepSize(load);
        BigDecimal result = decrease ? load.subtract(stepSize) : load.add(stepSize);
        return result.compareTo(BigDecimal.ZERO) <= 0 ? null : result;
    }

    private static BigDecimal stepSize(BigDecimal load) {
        return load.compareTo(HEAVY_LOAD_THRESHOLD) >= 0 ? HEAVY_STEP : LIGHT_STEP;
    }

    private static String format(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private boolean isBlockedByActiveRestriction(UUID userId, UUID exerciseId) {
        List<InjuryRestriction> restrictions = restrictionRepository.findByUserId(userId);
        return restrictions.stream()
                .filter(InjuryRestriction::isActive)
                .anyMatch(restriction -> restriction.getExerciseIds().contains(exerciseId));
    }

    /**
     * Result of the rules, before the persistence.
     */
    private record Analysis(
            String rule,
            String confidence,
            List<SuggestedSetResponse> sets,
            String explanation,
            List<String> warnings) {
    }
}
