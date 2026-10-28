package com.ironmind.workout.service;

import com.ironmind.common.exception.ConflictException;
import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.common.idempotency.IdempotencyService;
import com.ironmind.common.web.PageResponse;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.program.entity.ProgramDay;
import com.ironmind.program.entity.ProgramExercise;
import com.ironmind.program.entity.WorkoutProgram;
import com.ironmind.program.repository.ProgramDayRepository;
import com.ironmind.program.repository.ProgramExerciseRepository;
import com.ironmind.program.repository.WorkoutProgramRepository;
import com.ironmind.workout.dto.AddSessionExerciseRequest;
import com.ironmind.workout.dto.SessionExerciseResponse;
import com.ironmind.workout.dto.SessionResponse;
import com.ironmind.workout.dto.StartSessionRequest;
import com.ironmind.workout.dto.UpdateSessionStatusRequest;
import com.ironmind.workout.entity.ExerciseSet;
import com.ironmind.workout.entity.SessionExercise;
import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import com.ironmind.workout.repository.ExerciseSetRepository;
import com.ironmind.workout.repository.SessionExerciseRepository;
import com.ironmind.workout.repository.WorkoutSessionRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rules of the training sessions (SPEC.md section 7.8).
 *
 * <p>The service owns the ownership rule: a session of another user is reported as not found,
 * never as forbidden, so the API never reveals the existence of foreign data. The owner always
 * comes from the header injected by the gateway.
 *
 * <p>The service also owns the copy of the program day: a session started from a day of a program
 * brings the exercises of the day in the same order, so the application does not have to build
 * the list of the workout. The copy carries the snapshot of the plan — the targets of sets and
 * repetitions and the observations of the program exercise — so editing or deleting the program
 * never changes a session that already happened (SPEC.md section 7.6).
 */
@Service
@Transactional(readOnly = true)
public class WorkoutSessionService {

    /**
     * Scope of the idempotency keys of the creation of a session.
     */
    private static final String CREATE_SCOPE = "POST /api/v1/workout-sessions";

    /**
     * Scope of the idempotency keys of the addition of an exercise to a session.
     */
    private static final String ADD_EXERCISE_SCOPE = "POST /api/v1/workout-sessions/{id}/exercises";

    /**
     * Fields accepted by the sort parameter of the listing.
     */
    private static final Set<String> SORTABLE_FIELDS = Set.of("startedAt", "completedAt", "status", "createdAt");

    /**
     * Field used when the request does not inform the sort.
     */
    private static final String DEFAULT_SORT_FIELD = "startedAt";

    private final WorkoutSessionRepository sessionRepository;
    private final SessionExerciseRepository sessionExerciseRepository;
    private final ExerciseSetRepository exerciseSetRepository;
    private final ProgramDayRepository programDayRepository;
    private final ProgramExerciseRepository programExerciseRepository;
    private final WorkoutProgramRepository programRepository;
    private final ExerciseRepository exerciseRepository;
    private final IdempotencyService idempotencyService;

    public WorkoutSessionService(WorkoutSessionRepository sessionRepository,
            SessionExerciseRepository sessionExerciseRepository, ExerciseSetRepository exerciseSetRepository,
            ProgramDayRepository programDayRepository, ProgramExerciseRepository programExerciseRepository,
            WorkoutProgramRepository programRepository, ExerciseRepository exerciseRepository,
            IdempotencyService idempotencyService) {
        this.sessionRepository = sessionRepository;
        this.sessionExerciseRepository = sessionExerciseRepository;
        this.exerciseSetRepository = exerciseSetRepository;
        this.programDayRepository = programDayRepository;
        this.programExerciseRepository = programExerciseRepository;
        this.programRepository = programRepository;
        this.exerciseRepository = exerciseRepository;
        this.idempotencyService = idempotencyService;
    }

    /**
     * Lists the sessions of the user, with the exercises and the sets embedded.
     *
     * <p>The default order is {@code startedAt} descending: the most recent session comes first
     * (SPEC.md section 7.8).
     *
     * @param userId identifier of the user of the request, always taken from the gateway header
     */
    public PageResponse<SessionResponse> list(int page, int size, String sort, UUID userId) {
        Pageable pageable = PageRequest.of(page, size, sortOf(sort));
        Page<WorkoutSession> sessions = sessionRepository.findByUserId(userId, pageable);
        return toPageResponse(sessions);
    }

    /**
     * Returns a session of the user, with the exercises and the sets embedded.
     *
     * @throws ResourceNotFoundException when the session does not exist or belongs to another user
     */
    public SessionResponse findById(UUID id, UUID userId) {
        WorkoutSession session = requireOwnedSession(id, userId);
        return toResponse(session);
    }

    /**
     * Starts a session owned by the user of the request.
     *
     * <p>When the request carries a {@code programDayId}, the exercises of the day are copied into
     * the session, in the same order, and the answer brings the session already with the
     * exercises. A session started without a day starts without exercises: the exercises are added
     * one by one during the workout (SPEC.md section 7.8).
     *
     * @throws ResourceNotFoundException when the program or the day does not exist or belongs to
     *                                   another user
     */
    @Transactional
    public CreationResult start(StartSessionRequest request, UUID userId, String idempotencyKey) {
        String fingerprint = IdempotencyService.fingerprint(request.canonicalPayload());
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = idempotencyService.findExistingResource(CREATE_SCOPE, idempotencyKey, userId, fingerprint);
            if (existing.isPresent()) {
                return new CreationResult(findById(existing.get(), userId), false);
            }
        }

        ProgramDay day = resolveProgramDay(request, userId);

        WorkoutSession session = sessionRepository.save(new WorkoutSession(UUID.randomUUID(), userId,
                day == null ? request.programId() : day.getProgramId(),
                day == null ? null : day.getId(),
                Instant.now(),
                SessionStatus.IN_PROGRESS));

        if (day != null) {
            copyDayExercises(day, session);
        }

        idempotencyService.rememberAfterCommit(CREATE_SCOPE, idempotencyKey, userId, fingerprint, session.getId());
        return new CreationResult(toResponse(session), true);
    }

    /**
     * Adds an exercise to a session of the user.
     *
     * <p>The exercise must exist in the catalog and must be visible to the user: an unknown
     * exercise is refused with {@code 422} and the path of the rejected field. The same exercise
     * is never added twice to the same session, and a finished session accepts no new exercise
     * (SPEC.md section 7.8).
     *
     * @throws ResourceNotFoundException when the session does not exist or belongs to another user
     * @throws ConflictException          when the exercise is already in the session, when the
     *                                    position is taken or when the session is finished
     */
    @Transactional
    public ExerciseAddition addExercise(UUID sessionId, AddSessionExerciseRequest request, UUID userId,
            String idempotencyKey) {
        WorkoutSession session = requireOwnedSession(sessionId, userId);
        String scope = ADD_EXERCISE_SCOPE.replace("{id}", sessionId.toString());
        String fingerprint = IdempotencyService.fingerprint(request.canonicalPayload());
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = idempotencyService.findExistingResource(scope, idempotencyKey, userId, fingerprint);
            if (existing.isPresent()) {
                SessionExercise replay = sessionExerciseRepository.findById(existing.get())
                        .orElseThrow(() -> new ResourceNotFoundException("exercício da sessão", existing.get()));
                return new ExerciseAddition(
                        SessionExerciseResponse.from(replay, requireExercise(replay.getExerciseId()), List.of()),
                        false);
            }
        }

        if (session.isFinalized()) {
            throw new ConflictException("A sessão já foi finalizada e não aceita novos exercícios.");
        }

        Exercise exercise = exerciseRepository.findById(request.exerciseId())
                .filter(candidate -> candidate.isVisibleTo(userId))
                .orElseThrow(() -> new FieldValidationException("exerciseId",
                        "O exercício informado não existe no catálogo."));

        if (sessionExerciseRepository.existsBySessionIdAndExerciseId(sessionId, exercise.getId())) {
            throw new ConflictException("Este exercício já faz parte da sessão.");
        }

        int position = request.position() == null
                ? maxPosition(sessionId) + 1
                : request.position();
        if (sessionExerciseRepository.existsBySessionIdAndPosition(sessionId, position)) {
            throw new ConflictException("Já existe um exercício na posição " + position + " da sessão.");
        }

        SessionExercise sessionExercise = sessionExerciseRepository.save(
                new SessionExercise(UUID.randomUUID(), sessionId, exercise.getId(), position, request.notes()));

        idempotencyService.rememberAfterCommit(scope, idempotencyKey, userId, fingerprint, sessionExercise.getId());
        return new ExerciseAddition(SessionExerciseResponse.from(sessionExercise, exercise, List.of()), true);
    }

    /**
     * Changes the state of a session of the user.
     *
     * <p>Pausing and resuming are free; completing and abandoning never go back. A finished
     * session is immutable, so it accepts no change of state (SPEC.md section 7.8).
     *
     * @throws ResourceNotFoundException when the session does not exist or belongs to another user
     * @throws ConflictException          when the session is finished or when the transition is not
     *                                    allowed
     */
    @Transactional
    public SessionResponse updateStatus(UUID sessionId, UpdateSessionStatusRequest request, UUID userId) {
        WorkoutSession session = requireOwnedSession(sessionId, userId);
        SessionStatus target = request.status();

        if (target == null) {
            throw new FieldValidationException("status", "O estado da sessão é obrigatório.");
        }
        if (session.isFinalized()) {
            throw new ConflictException("A sessão já foi finalizada e não aceita mudanças de estado.");
        }

        switch (target) {
            case PAUSED -> session.pause();
            case IN_PROGRESS -> session.resume();
            case ABANDONED -> session.abandon();
            case COMPLETED -> session.complete(Instant.now());
        }
        if (request.notes() != null) {
            session.updateNotes(request.notes());
        }

        return toResponse(sessionRepository.save(session));
    }

    /**
     * Concludes a session of the user and stamps the moment it ended.
     *
     * @throws ResourceNotFoundException when the session does not exist or belongs to another user
     * @throws ConflictException          when the session is already finished
     */
    @Transactional
    public SessionResponse complete(UUID sessionId, UUID userId) {
        WorkoutSession session = requireOwnedSession(sessionId, userId);
        if (session.isFinalized()) {
            throw new ConflictException("A sessão já foi finalizada.");
        }
        session.complete(Instant.now());
        return toResponse(sessionRepository.save(session));
    }

    /**
     * Loads the session of the user, or fails when it does not exist or belongs to another user.
     */
    public WorkoutSession requireOwnedSession(UUID id, UUID userId) {
        return sessionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("sessão", id));
    }

    /**
     * Resolves the day of the program informed by the request.
     *
     * <p>The program and the day must be of the user: a reference to another user is reported as
     * not found (SPEC.md section 7.8).
     *
     * @return the day of the program, or {@code null} when the request has no day
     */
    private ProgramDay resolveProgramDay(StartSessionRequest request, UUID userId) {
        if (request.programDayId() == null) {
            if (request.programId() != null) {
                requireOwnedProgram(request.programId(), userId);
            }
            return null;
        }

        ProgramDay day = programDayRepository.findById(request.programDayId())
                .orElseThrow(() -> new ResourceNotFoundException("dia de programa", request.programDayId()));
        WorkoutProgram program = requireOwnedProgram(day.getProgramId(), userId);
        if (request.programId() != null && !request.programId().equals(program.getId())) {
            throw new FieldValidationException("programDayId",
                    "O dia informado não pertence ao programa informado.");
        }
        return day;
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
     * Copies the exercises of the program day into the session, keeping the order of the day.
     *
     * <p>The copy carries the snapshot of the plan: the observations of the program exercise and
     * the targets of sets and repetitions travel with the session, so editing or deleting the
     * program never changes a session that already happened (SPEC.md section 7.6).
     */
    private void copyDayExercises(ProgramDay day, WorkoutSession session) {
        List<ProgramExercise> programExercises = programExerciseRepository
                .findByDayIdOrderByPositionAsc(day.getId());
        List<SessionExercise> copies = new ArrayList<>();
        int position = 1;
        for (ProgramExercise programExercise : programExercises) {
            copies.add(new SessionExercise(UUID.randomUUID(), session.getId(), programExercise.getExerciseId(),
                    position, snapshotOf(programExercise), programExercise.getTargetSets(),
                    programExercise.getTargetRepsMin(), programExercise.getTargetRepsMax(),
                    programExercise.getRestSeconds()));
            position++;
        }
        sessionExerciseRepository.saveAll(copies);
    }

    /**
     * Builds the readable summary of the plan of an exercise of the program day.
     *
     * <p>The plan itself travels in the dedicated fields of the session exercise. This text is the
     * version shown to the user, next to the numbers the exercise was performed with.
     *
     * @param programExercise entry of the program day
     * @return the observations of the user with the targets of sets and repetitions
     */
    private static String snapshotOf(ProgramExercise programExercise) {
        StringBuilder snapshot = new StringBuilder();
        snapshot.append(programExercise.getTargetSets())
                .append('x')
                .append(programExercise.getTargetRepsMin())
                .append('-')
                .append(programExercise.getTargetRepsMax());
        if (programExercise.getRestSeconds() != null) {
            snapshot.append(" (descanso ").append(programExercise.getRestSeconds()).append("s)");
        }
        String notes = programExercise.getNotes();
        if (notes != null && !notes.isBlank()) {
            snapshot.append(" — ").append(notes.trim());
        }
        return snapshot.toString();
    }

    /**
     * Builds the answer of a session, with the exercises and the sets embedded.
     */
    private SessionResponse toResponse(WorkoutSession session) {
        List<SessionExercise> sessionExercises =
                sessionExerciseRepository.findBySessionIdOrderByPositionAsc(session.getId());
        Map<UUID, Exercise> exercises = exercisesOf(sessionExercises);
        Map<UUID, List<ExerciseSet>> setsByExercise = setsBySessionExercise(
                sessionExercises.stream().map(SessionExercise::getId).toList());
        return SessionResponse.from(session, toExerciseResponses(sessionExercises, exercises, setsByExercise));
    }

    /**
     * Builds the answer of a page of sessions, with the exercises and the sets embedded.
     */
    private PageResponse<SessionResponse> toPageResponse(Page<WorkoutSession> page) {
        List<WorkoutSession> sessions = page.getContent();
        if (sessions.isEmpty()) {
            return new PageResponse<>(List.of(), page.getNumber(), page.getSize(), page.getTotalElements(),
                    page.getTotalPages(), page.hasNext());
        }

        List<SessionExercise> sessionExercises = sessionExerciseRepository.findBySessionIdInOrderBySessionIdAscPositionAsc(
                sessions.stream().map(WorkoutSession::getId).toList());
        Map<UUID, Exercise> exercises = exercisesOf(sessionExercises);
        Map<UUID, List<ExerciseSet>> setsByExercise = setsBySessionExercise(
                sessionExercises.stream().map(SessionExercise::getId).toList());

        Map<UUID, List<SessionExerciseResponse>> bySession = new LinkedHashMap<>();
        for (SessionExercise sessionExercise : sessionExercises) {
            bySession.computeIfAbsent(sessionExercise.getSessionId(), key -> new ArrayList<>())
                    .add(SessionExerciseResponse.from(sessionExercise,
                            requireExercise(sessionExercise.getExerciseId(), exercises),
                            setsByExercise.getOrDefault(sessionExercise.getId(), List.of())));
        }

        List<SessionResponse> content = sessions.stream()
                .map(session -> SessionResponse.from(session, bySession.getOrDefault(session.getId(), List.of())))
                .toList();

        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(),
                page.getTotalPages(), page.hasNext());
    }

    /**
     * Maps the exercises of a session into the API representation.
     */
    private static List<SessionExerciseResponse> toExerciseResponses(List<SessionExercise> sessionExercises,
            Map<UUID, Exercise> exercises, Map<UUID, List<ExerciseSet>> setsByExercise) {
        return sessionExercises.stream()
                .map(sessionExercise -> SessionExerciseResponse.from(sessionExercise,
                        requireExercise(sessionExercise.getExerciseId(), exercises),
                        setsByExercise.getOrDefault(sessionExercise.getId(), List.of())))
                .toList();
    }

    /**
     * Groups the sets by the exercise of the session they belong to.
     */
    private Map<UUID, List<ExerciseSet>> setsBySessionExercise(Collection<UUID> sessionExerciseIds) {
        Map<UUID, List<ExerciseSet>> setsByExercise = new LinkedHashMap<>();
        if (sessionExerciseIds.isEmpty()) {
            return setsByExercise;
        }
        for (ExerciseSet set : exerciseSetRepository
                .findBySessionExerciseIdInOrderBySessionExerciseIdAscSetNumberAsc(sessionExerciseIds)) {
            setsByExercise.computeIfAbsent(set.getSessionExerciseId(), key -> new ArrayList<>()).add(set);
        }
        return setsByExercise;
    }

    /**
     * Loads the exercises of the entries in a single round trip.
     */
    private Map<UUID, Exercise> exercisesOf(Collection<SessionExercise> sessionExercises) {
        Set<UUID> exerciseIds = sessionExercises.stream().map(SessionExercise::getExerciseId)
                .collect(Collectors.toSet());
        if (exerciseIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Exercise> exercises = new HashMap<>();
        for (Exercise exercise : exerciseRepository.findAllById(exerciseIds)) {
            exercises.put(exercise.getId(), exercise);
        }
        return exercises;
    }

    /**
     * Returns the exercise of the catalog, or fails when it no longer exists.
     */
    private Exercise requireExercise(UUID exerciseId) {
        return exerciseRepository.findById(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("exercício", exerciseId));
    }

    private static Exercise requireExercise(UUID exerciseId, Map<UUID, Exercise> exercises) {
        Exercise exercise = exercises.get(exerciseId);
        if (exercise == null) {
            throw new ResourceNotFoundException("exercício", exerciseId);
        }
        return exercise;
    }

    /**
     * Returns the biggest position used by the exercises of the session, zero when there is none.
     */
    private int maxPosition(UUID sessionId) {
        return sessionExerciseRepository.findFirstBySessionIdOrderByPositionDesc(sessionId)
                .map(SessionExercise::getPosition)
                .orElse(0);
    }

    /**
     * Builds the sort of the listing, accepting only the fields of the session.
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
     * Result of a creation, telling whether the resource was created or replayed.
     *
     * @param session the created (or replayed) session
     * @param created {@code true} when the resource was created by this request
     */
    public record CreationResult(SessionResponse session, boolean created) {
    }

    /**
     * Result of the addition of an exercise to a session.
     *
     * @param exercise the created (or replayed) exercise of the session
     * @param created  {@code true} when the exercise was added by this request
     */
    public record ExerciseAddition(SessionExerciseResponse exercise, boolean created) {
    }
}
