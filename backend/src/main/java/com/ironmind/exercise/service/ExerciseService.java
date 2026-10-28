package com.ironmind.exercise.service;

import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.common.idempotency.IdempotencyService;
import com.ironmind.common.web.PageResponse;
import com.ironmind.exercise.dto.CreateExerciseRequest;
import com.ironmind.exercise.dto.ExerciseQuery;
import com.ironmind.exercise.dto.ExerciseResponse;
import com.ironmind.exercise.dto.UpdateExerciseRequest;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.repository.ExerciseRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Business rules of the exercise catalog.
 *
 * <p>The service owns the visibility rules: a user only sees the global catalog and their own
 * personal exercises, and a resource of another user is reported as not found (SPEC.md
 * appendix A).
 */
@Service
@Transactional(readOnly = true)
public class ExerciseService {

    /**
     * Scope of the idempotency keys of the exercise creation.
     */
    private static final String CREATE_SCOPE = "POST /api/v1/exercises";

    private final ExerciseRepository exerciseRepository;
    private final MongoTemplate mongoTemplate;
    private final IdempotencyService idempotencyService;

    public ExerciseService(ExerciseRepository exerciseRepository, MongoTemplate mongoTemplate,
            IdempotencyService idempotencyService) {
        this.exerciseRepository = exerciseRepository;
        this.mongoTemplate = mongoTemplate;
        this.idempotencyService = idempotencyService;
    }

    /**
     * Lists the exercises visible to the user, applying the informed filters.
     */
    public PageResponse<ExerciseResponse> list(ExerciseQuery query, UUID userId) {
        Pageable pageable = pageableOf(query);
        Query mongoQuery = new Query(criteriaOf(query, userId)).with(pageable);
        List<Exercise> content = mongoTemplate.find(mongoQuery, Exercise.class);
        long total = mongoTemplate.count(Query.of(mongoQuery).limit(-1).skip(-1), Exercise.class);
        return PageResponse.of(new PageImpl<>(content, pageable, total), ExerciseResponse::from);
    }

    /**
     * Returns a single exercise visible to the user.
     *
     * @throws ResourceNotFoundException when the exercise does not exist or belongs to another user
     */
    public ExerciseResponse findById(UUID id, UUID userId) {
        Exercise exercise = exerciseRepository.findById(id)
                .filter(candidate -> candidate.isVisibleTo(userId))
                .orElseThrow(() -> new ResourceNotFoundException("exercício", id));
        return ExerciseResponse.from(exercise);
    }

    /**
     * Creates a personal exercise owned by the user of the request.
     *
     * <p>The owner always comes from the gateway header, never from the request body. When an
     * {@code Idempotency-Key} header is informed, a replay with the same payload returns the
     * exercise created by the first request instead of creating a new one.
     */
    @Transactional
    public CreationResult create(CreateExerciseRequest request, UUID userId, String idempotencyKey) {
        String fingerprint = IdempotencyService.fingerprint(request.canonicalPayload());
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = idempotencyService.findExistingResource(CREATE_SCOPE, idempotencyKey, userId, fingerprint);
            if (existing.isPresent()) {
                return new CreationResult(findById(existing.get(), userId), false);
            }
        }

        Exercise exercise = new Exercise(
                UUID.randomUUID(),
                request.name().trim(),
                request.description(),
                request.primaryMuscleGroup().trim(),
                request.secondaryMuscleGroups(),
                request.equipment().trim(),
                request.instructions(),
                request.movementType(),
                userId);
        Exercise saved = exerciseRepository.save(exercise);
        idempotencyService.rememberAfterCommit(CREATE_SCOPE, idempotencyKey, userId, fingerprint, saved.getId());
        return new CreationResult(ExerciseResponse.from(saved), true);
    }

    /**
     * Updates a personal exercise owned by the user of the request.
     *
     * @throws ResourceNotFoundException when the exercise does not exist or belongs to another user
     */
    @Transactional
    public ExerciseResponse update(UUID id, UpdateExerciseRequest request, UUID userId) {
        Exercise exercise = exerciseRepository.findById(id)
                .filter(candidate -> candidate.isEditableBy(userId))
                .orElseThrow(() -> new ResourceNotFoundException("exercício", id));

        exercise.update(
                request.name() == null ? exercise.getName() : request.name().trim(),
                request.description() == null ? exercise.getDescription() : request.description(),
                request.primaryMuscleGroup() == null ? exercise.getPrimaryMuscleGroup() : request.primaryMuscleGroup().trim(),
                request.secondaryMuscleGroups() == null ? exercise.getSecondaryMuscleGroups() : request.secondaryMuscleGroups(),
                request.equipment() == null ? exercise.getEquipment() : request.equipment().trim(),
                request.instructions() == null ? exercise.getInstructions() : request.instructions(),
                request.movementType() == null ? exercise.getMovementType() : request.movementType());
        return ExerciseResponse.from(exerciseRepository.save(exercise));
    }

    /**
     * Result of a creation, telling whether the resource was created or replayed.
     *
     * @param exercise the created (or replayed) exercise
     * @param created  {@code true} when the resource was created by this request
     */
    public record CreationResult(ExerciseResponse exercise, boolean created) {
    }

    private Criteria criteriaOf(ExerciseQuery query, UUID userId) {
        List<Criteria> predicates = new ArrayList<>();

        if (query.onlyMine()) {
            predicates.add(Criteria.where("createdByUserId").is(userId));
        } else if (userId == null) {
            predicates.add(Criteria.where("createdByUserId").is(null));
        } else {
            predicates.add(new Criteria().orOperator(
                    Criteria.where("createdByUserId").is(null),
                    Criteria.where("createdByUserId").is(userId)));
        }

        if (query.muscleGroup() != null && !query.muscleGroup().isBlank()) {
            predicates.add(Criteria.where("primaryMuscleGroup")
                    .regex(exactIgnoreCase(query.muscleGroup().trim())));
        }

        if (query.equipment() != null && !query.equipment().isBlank()) {
            predicates.add(Criteria.where("equipment").regex(exactIgnoreCase(query.equipment().trim())));
        }

        if (query.search() != null && !query.search().isBlank()) {
            predicates.add(Criteria.where("name").regex(containsIgnoreCase(query.search().trim())));
        }

        return new Criteria().andOperator(predicates.toArray(Criteria[]::new));
    }

    private static Pattern exactIgnoreCase(String value) {
        return Pattern.compile("^" + Pattern.quote(value) + "$", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }

    private static Pattern containsIgnoreCase(String value) {
        return Pattern.compile(Pattern.quote(value), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }

    private Pageable pageableOf(ExerciseQuery query) {
        return PageRequest.of(query.page(), query.size(), sortOf(query.sort()));
    }

    private Sort sortOf(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.ASC, "name");
        }
        String[] parts = sort.split(",");
        String property = parts[0].trim();
        Sort.Direction direction = parts.length > 1 ? Sort.Direction.fromOptionalString(parts[1].trim()).orElse(Sort.Direction.ASC)
                : Sort.Direction.ASC;
        if (!ExerciseQuery.SORTABLE_FIELDS.contains(property)) {
            property = "name";
        }
        return Sort.by(direction, property);
    }
}
