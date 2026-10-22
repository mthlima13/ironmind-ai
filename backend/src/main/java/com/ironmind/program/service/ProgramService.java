package com.ironmind.program.service;

import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.common.idempotency.IdempotencyService;
import com.ironmind.common.web.PageResponse;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.program.dto.CreateProgramRequest;
import com.ironmind.program.dto.ProgramDayRequest;
import com.ironmind.program.dto.ProgramDayResponse;
import com.ironmind.program.dto.ProgramExerciseRequest;
import com.ironmind.program.dto.ProgramExerciseResponse;
import com.ironmind.program.dto.ProgramResponse;
import com.ironmind.program.entity.ProgramDay;
import com.ironmind.program.entity.ProgramExercise;
import com.ironmind.program.entity.WorkoutProgram;
import com.ironmind.program.repository.ProgramDayRepository;
import com.ironmind.program.repository.ProgramExerciseRepository;
import com.ironmind.program.repository.WorkoutProgramRepository;
import com.ironmind.user.entity.User;
import com.ironmind.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rules of the training programs.
 *
 * <p>The service owns the ownership rule: a program of another user is reported as not found,
 * never as forbidden, so the API never reveals the existence of foreign data (SPEC.md appendix
 * A). The owner always comes from the access token.
 *
 * <p>The service also owns the replacement rule: creating or updating a program writes the days
 * and the exercises in the order they are sent, and the update removes the entries that are not
 * sent anymore. The structure of a program is never merged.
 */
@Service
@Transactional(readOnly = true)
public class ProgramService {

    /**
     * Scope of the idempotency keys of the creation of a program.
     */
    private static final String CREATE_SCOPE = "POST /api/v1/programs";

    /**
     * Fields accepted by the sort parameter of the listing.
     */
    private static final Set<String> SORTABLE_FIELDS = Set.of("name", "createdAt", "updatedAt");

    /**
     * Field used when the request does not inform the sort.
     */
    private static final String DEFAULT_SORT_FIELD = "createdAt";

    private final WorkoutProgramRepository programRepository;
    private final ProgramDayRepository programDayRepository;
    private final ProgramExerciseRepository programExerciseRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserRepository userRepository;
    private final IdempotencyService idempotencyService;

    public ProgramService(WorkoutProgramRepository programRepository, ProgramDayRepository programDayRepository,
            ProgramExerciseRepository programExerciseRepository, ExerciseRepository exerciseRepository,
            UserRepository userRepository, IdempotencyService idempotencyService) {
        this.programRepository = programRepository;
        this.programDayRepository = programDayRepository;
        this.programExerciseRepository = programExerciseRepository;
        this.exerciseRepository = exerciseRepository;
        this.userRepository = userRepository;
        this.idempotencyService = idempotencyService;
    }

    /**
     * Lists the programs of the user.
     *
     * <p>The archived programs are left out of the listing by default: archiving is not deletion,
     * and the program stays reachable by its identifier.
     *
     * @param userId          identifier of the authenticated user, always taken from the access token
     * @param includeArchived whether the archived programs are listed too
     */
    public PageResponse<ProgramResponse> list(int page, int size, String sort, boolean includeArchived,
            UUID userId) {
        Pageable pageable = PageRequest.of(page, size, sortOf(sort));
        Page<WorkoutProgram> programs = includeArchived
                ? programRepository.findAllByUser(userId, pageable)
                : programRepository.findActiveByUser(userId, pageable);

        List<UUID> programIds = programs.getContent().stream().map(WorkoutProgram::getId).toList();
        List<ProgramDay> days = programIds.isEmpty() ? List.of() : programDayRepository.findByProgramIds(programIds);
        List<ProgramExercise> exercises = programIds.isEmpty()
                ? List.of()
                : programExerciseRepository.findByProgramIds(programIds);

        Map<UUID, List<ProgramExerciseResponse>> exercisesByDay = groupExercisesByDay(exercises);
        return PageResponse.of(programs, program -> toResponse(program, days, exercisesByDay));
    }

    /**
     * Returns a program of the user, with its days and exercises.
     *
     * <p>An archived program stays accessible: the owner can still consult what it planned.
     *
     * @throws ResourceNotFoundException when the program does not exist or belongs to another user
     */
    public ProgramResponse findById(UUID id, UUID userId) {
        WorkoutProgram program = requireOwnedProgram(id, userId);
        List<ProgramDay> days = programDayRepository.findByProgramId(program.getId());
        List<ProgramExercise> exercises = programExerciseRepository.findByProgramId(program.getId());
        return toResponse(program, days, groupExercisesByDay(exercises));
    }

    /**
     * Creates a program owned by the authenticated user.
     *
     * <p>When an {@code Idempotency-Key} header is informed, a replay with the same payload
     * returns the program created by the first request instead of creating a new one.
     */
    @Transactional
    public CreationResult create(CreateProgramRequest request, UUID userId, String idempotencyKey) {
        String fingerprint = IdempotencyService.fingerprint(request.canonicalPayload());
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = idempotencyService.findExistingResource(CREATE_SCOPE, idempotencyKey, userId, fingerprint);
            if (existing.isPresent()) {
                return new CreationResult(findById(existing.get(), userId), false);
            }
        }

        User owner = requireUser(userId);
        List<ResolvedDay> days = resolve(request.days(), userId);

        WorkoutProgram program = programRepository.save(new WorkoutProgram(UUID.randomUUID(), owner,
                request.name().trim(), request.description(), request.goal(), request.splitType()));

        Structure structure = persist(program, days);

        idempotencyService.rememberAfterCommit(CREATE_SCOPE, idempotencyKey, userId, fingerprint, program.getId());
        return new CreationResult(
                toResponse(program, structure.days(), groupExercisesByDay(structure.exercises())), true);
    }

    /**
     * Replaces the content and the whole structure of a program of the user.
     *
     * <p>The days and the exercises of the body replace the stored ones: the entries that are not
     * sent anymore are removed, and the positions follow the order of the body. The archived
     * state is kept, because the update does not resurrect an archived program.
     *
     * @throws ResourceNotFoundException when the program does not exist or belongs to another user
     */
    @Transactional
    public ProgramResponse update(UUID id, CreateProgramRequest request, UUID userId) {
        WorkoutProgram program = requireOwnedProgram(id, userId);
        List<ResolvedDay> days = resolve(request.days(), userId);

        program.update(request.name().trim(), request.description(), request.goal(), request.splitType());
        programRepository.save(program);

        programExerciseRepository.deleteAllByProgramId(program.getId());
        programDayRepository.deleteAllByProgramId(program.getId());
        programRepository.flush();

        Structure structure = persist(program, days);
        programRepository.flush();

        return toResponse(program, structure.days(), groupExercisesByDay(structure.exercises()));
    }

    /**
     * Archives a program of the user.
     *
     * <p>Archiving is not deletion: the program and its history are kept, and the program leaves
     * the default listing (SPEC.md section 10.4).
     *
     * @throws ResourceNotFoundException when the program does not exist or belongs to another user
     */
    @Transactional
    public void archive(UUID id, UUID userId) {
        WorkoutProgram program = requireOwnedProgram(id, userId);
        program.archive();
        programRepository.save(program);
    }

    /**
     * Result of a creation, telling whether the resource was created or replayed.
     *
     * @param program the created (or replayed) program
     * @param created {@code true} when the resource was created by this request
     */
    public record CreationResult(ProgramResponse program, boolean created) {
    }

    /**
     * Loads the program of the user, or fails when it does not exist or belongs to another user.
     */
    private WorkoutProgram requireOwnedProgram(UUID id, UUID userId) {
        return programRepository.findById(id)
                .filter(program -> program.isOwnedBy(userId))
                .orElseThrow(() -> new ResourceNotFoundException("programa", id));
    }

    /**
     * Loads the account of the token.
     */
    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("usuário", userId));
    }

    /**
     * Validates the days of the payload and resolves the exercises of the catalog.
     *
     * <p>The rules that only the service can evaluate are checked here: the exercise must exist
     * and must be visible to the user, and the biggest number of repetitions cannot be smaller
     * than the smallest one. The answer keeps the path of the rejected field, so the client can
     * point the user to the right input (SPEC.md appendix A.1).
     */
    private List<ResolvedDay> resolve(List<ProgramDayRequest> days, UUID userId) {
        if (days == null || days.isEmpty()) {
            return List.of();
        }

        List<ResolvedDay> resolved = new ArrayList<>();
        for (int dayIndex = 0; dayIndex < days.size(); dayIndex++) {
            ProgramDayRequest dayRequest = days.get(dayIndex);
            List<ProgramExerciseRequest> exercises = dayRequest.exercises() == null
                    ? List.of()
                    : dayRequest.exercises();

            List<ResolvedExercise> resolvedExercises = new ArrayList<>();
            for (int exerciseIndex = 0; exerciseIndex < exercises.size(); exerciseIndex++) {
                ProgramExerciseRequest exerciseRequest = exercises.get(exerciseIndex);
                String path = "days[" + dayIndex + "].exercises[" + exerciseIndex + "]";

                if (exerciseRequest.targetRepsMax() < exerciseRequest.targetRepsMin()) {
                    throw new FieldValidationException(path + ".targetRepsMax",
                            "O número máximo de repetições deve ser maior ou igual ao número mínimo.");
                }

                Exercise exercise = exerciseRepository.findById(exerciseRequest.exerciseId())
                        .filter(candidate -> candidate.isVisibleTo(userId))
                        .orElseThrow(() -> new FieldValidationException(path + ".exerciseId",
                                "O exercício informado não existe no catálogo."));

                resolvedExercises.add(new ResolvedExercise(exercise, exerciseRequest));
            }

            resolved.add(new ResolvedDay(dayRequest.name().trim(), resolvedExercises));
        }
        return resolved;
    }

    /**
     * Writes the days and the exercises of a program, in the order they were resolved.
     *
     * <p>The position of every entry is the position of the payload, starting at one, so the
     * order of the answer is always deterministic.
     */
    private Structure persist(WorkoutProgram program, List<ResolvedDay> days) {
        List<ProgramDay> daysToSave = new ArrayList<>();
        for (ResolvedDay resolvedDay : days) {
            daysToSave.add(new ProgramDay(UUID.randomUUID(), program, resolvedDay.name(), daysToSave.size() + 1));
        }
        List<ProgramDay> savedDays = programDayRepository.saveAll(daysToSave);

        List<ProgramExercise> exercisesToSave = new ArrayList<>();
        for (int dayIndex = 0; dayIndex < days.size(); dayIndex++) {
            ProgramDay savedDay = savedDays.get(dayIndex);
            int position = 1;
            for (ResolvedExercise resolvedExercise : days.get(dayIndex).exercises()) {
                exercisesToSave.add(new ProgramExercise(UUID.randomUUID(), savedDay, resolvedExercise.exercise(),
                        position++, resolvedExercise.request().targetSets(),
                        resolvedExercise.request().targetRepsMin(),
                        resolvedExercise.request().targetRepsMax(),
                        resolvedExercise.request().restSeconds(),
                        resolvedExercise.request().notes()));
            }
        }
        List<ProgramExercise> savedExercises = programExerciseRepository.saveAll(exercisesToSave);

        return new Structure(savedDays, savedExercises);
    }

    /**
     * Groups the exercises of the program by the day they belong to.
     */
    private Map<UUID, List<ProgramExerciseResponse>> groupExercisesByDay(List<ProgramExercise> exercises) {
        Map<UUID, List<ProgramExerciseResponse>> exercisesByDay = new LinkedHashMap<>();
        for (ProgramExercise programExercise : exercises) {
            exercisesByDay
                    .computeIfAbsent(programExercise.getDay().getId(), key -> new ArrayList<>())
                    .add(ProgramExerciseResponse.from(programExercise));
        }
        return exercisesByDay;
    }

    /**
     * Builds the answer of a program, with the days and the exercises grouped by day.
     */
    private ProgramResponse toResponse(WorkoutProgram program, List<ProgramDay> days,
            Map<UUID, List<ProgramExerciseResponse>> exercisesByDay) {
        List<ProgramDayResponse> dayResponses = days.stream()
                .filter(day -> day.getProgram().getId().equals(program.getId()))
                .map(day -> ProgramDayResponse.from(day, exercisesByDay.getOrDefault(day.getId(), List.of())))
                .toList();
        return ProgramResponse.from(program, dayResponses);
    }

    /**
     * Builds the sort of the listing, accepting only the fields of the program.
     */
    private Sort sortOf(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, DEFAULT_SORT_FIELD);
        }

        String[] parts = sort.split(",");
        String property = parts[0].trim();
        Sort.Direction direction = parts.length > 1
                ? Sort.Direction.fromOptionalString(parts[1].trim()).orElse(Sort.Direction.ASC)
                : Sort.Direction.ASC;
        if (!SORTABLE_FIELDS.contains(property)) {
            property = DEFAULT_SORT_FIELD;
            direction = Sort.Direction.DESC;
        }
        return Sort.by(direction, property);
    }

    /**
     * Structure written for a program: the days and the exercises, in the order of the payload.
     *
     * @param days      days of the program
     * @param exercises exercises of the days
     */
    private record Structure(List<ProgramDay> days, List<ProgramExercise> exercises) {
    }

    /**
     * Day of the payload, already validated and with the exercises of the catalog resolved.
     *
     * @param name      name of the day
     * @param exercises exercises of the day, in the order of the payload
     */
    private record ResolvedDay(String name, List<ResolvedExercise> exercises) {
    }

    /**
     * Exercise of the payload, already validated and with the catalog entry resolved.
     *
     * @param exercise exercise of the catalog
     * @param request  payload of the exercise
     */
    private record ResolvedExercise(Exercise exercise, ProgramExerciseRequest request) {
    }
}
