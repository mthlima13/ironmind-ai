package com.ironmind.ai.service;

import com.ironmind.ai.config.AiProperties;
import com.ironmind.ai.provider.AiContext;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.program.entity.SplitType;
import com.ironmind.user.entity.InjuryRestriction;
import com.ironmind.user.entity.TrainingExperience;
import com.ironmind.user.entity.TrainingGoal;
import com.ironmind.user.repository.InjuryRestrictionRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Builds the minimum context sent to the model (SPEC.md section 12.2, step 3).
 *
 * <p>The context carries the body regions of the active restrictions and the exercises the user
 * can perform. The free text of a restriction is <strong>not</strong> sent: it is health data that
 * the model does not need to avoid a contraindicated movement.
 *
 * <p>The service stores no profile of the user: the account belongs to the identity provider, so
 * the goal, the experience and the number of training days come from the request or from the
 * documented defaults.
 *
 * <p>An exercise blocked by an active restriction never reaches the catalog, so neither the model
 * nor the validator can accept it: the rule is applied before the answer exists.
 */
@Service
@Transactional(readOnly = true)
public class AiContextBuilder {

    private static final int DEFAULT_TRAINING_DAYS = 3;
    private static final int MAX_TRAINING_DAYS = 7;

    private final InjuryRestrictionRepository restrictionRepository;
    private final ExerciseRepository exerciseRepository;
    private final AiProperties properties;

    public AiContextBuilder(InjuryRestrictionRepository restrictionRepository,
            ExerciseRepository exerciseRepository,
            AiProperties properties) {
        this.restrictionRepository = restrictionRepository;
        this.exerciseRepository = exerciseRepository;
        this.properties = properties;
    }

    /**
     * Builds the context of the user without a division chosen by the user.
     *
     * @param userId                owner of the context
     * @param requestedTrainingDays number of days asked in the request, {@code null} to use the
     *                              default
     * @param requestedGoal         goal asked in the request, {@code null} to use the default
     * @return context with the catalog already filtered by restriction
     */
    public AiContext build(UUID userId, Integer requestedTrainingDays, TrainingGoal requestedGoal) {
        return build(userId, requestedTrainingDays, requestedGoal, null);
    }

    /**
     * Builds the context of the user.
     *
     * @param userId                owner of the context
     * @param requestedTrainingDays number of days asked in the request, {@code null} to use the
     *                              default
     * @param requestedGoal         goal asked in the request, {@code null} to use the default
     * @param requestedSplit        division asked in the request, {@code null} to let the model
     *                              choose
     * @return context with the catalog already filtered by restriction
     */
    public AiContext build(UUID userId, Integer requestedTrainingDays, TrainingGoal requestedGoal,
            SplitType requestedSplit) {
        List<InjuryRestriction> activeRestrictions = restrictionRepository.findByUserId(userId).stream()
                .filter(InjuryRestriction::isActive)
                .toList();
        Set<UUID> blockedExerciseIds = new HashSet<>();
        List<String> restrictionRegions = new ArrayList<>();
        for (InjuryRestriction restriction : activeRestrictions) {
            blockedExerciseIds.addAll(restriction.getExerciseIds());
            String region = restriction.getBodyRegion();
            if (region != null && !region.isBlank() && !restrictionRegions.contains(region.strip())) {
                restrictionRegions.add(region.strip());
            }
        }

        List<Exercise> visibleExercises = new ArrayList<>(exerciseRepository.findByCreatedByUserIdIsNull());
        visibleExercises.addAll(exerciseRepository.findByCreatedByUserId(userId));

        List<AiContext.CatalogExercise> catalog = visibleExercises.stream()
                .filter(exercise -> !blockedExerciseIds.contains(exercise.getId()))
                .sorted(catalogOrder())
                .limit(properties.limits().maxCatalogExercises())
                .map(AiContextBuilder::toCatalogExercise)
                .toList();

        return new AiContext(
                requestedGoal == null ? TrainingGoal.GENERAL : requestedGoal,
                TrainingExperience.BEGINNER,
                trainingDaysOf(requestedTrainingDays),
                List.of(),
                restrictionRegions,
                catalog,
                requestedSplit);
    }

    /**
     * Builds a short, non sensitive summary of the recent history of the user.
     *
     * @param completedSessions sessions completed in the last four weeks
     * @param lastSessionAt     moment of the last completed session, {@code null} when there is none
     * @return summary shown to the model, without any health or free text data
     */
    public String historySummary(long completedSessions, Instant lastSessionAt) {
        if (completedSessions <= 0) {
            return "nenhuma sessão concluída nas últimas quatro semanas";
        }
        String summary = completedSessions + " sessão(ões) concluída(s) nas últimas quatro semanas";
        if (lastSessionAt != null) {
            summary += ", última em " + lastSessionAt;
        }
        return summary;
    }

    private static AiContext.CatalogExercise toCatalogExercise(Exercise exercise) {
        return new AiContext.CatalogExercise(
                exercise.getId(),
                exercise.getName(),
                exercise.getPrimaryMuscleGroup(),
                exercise.getEquipment(),
                exercise.getMovementType());
    }

    private static Comparator<Exercise> catalogOrder() {
        return Comparator
                .comparingInt((Exercise exercise) -> exercise.getMovementType() == MovementType.COMPOUND ? 0 : 1)
                .thenComparing(exercise -> nullToEmpty(exercise.getPrimaryMuscleGroup()))
                .thenComparing(exercise -> nullToEmpty(exercise.getName()));
    }

    private static int trainingDaysOf(Integer requested) {
        if (requested != null && requested > 0) {
            return Math.min(requested, MAX_TRAINING_DAYS);
        }
        return DEFAULT_TRAINING_DAYS;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
