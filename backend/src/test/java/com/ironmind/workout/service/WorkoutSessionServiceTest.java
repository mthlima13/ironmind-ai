package com.ironmind.workout.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ironmind.common.exception.ConflictException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.common.idempotency.IdempotencyService;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.program.entity.ProgramDay;
import com.ironmind.program.entity.ProgramExercise;
import com.ironmind.program.entity.SplitType;
import com.ironmind.program.entity.WorkoutProgram;
import com.ironmind.program.repository.ProgramDayRepository;
import com.ironmind.program.repository.ProgramExerciseRepository;
import com.ironmind.program.repository.WorkoutProgramRepository;
import com.ironmind.user.entity.TrainingGoal;
import com.ironmind.workout.dto.AddSessionExerciseRequest;
import com.ironmind.workout.dto.SessionResponse;
import com.ironmind.workout.dto.StartSessionRequest;
import com.ironmind.workout.dto.UpdateSessionStatusRequest;
import com.ironmind.workout.entity.SessionExercise;
import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import com.ironmind.workout.repository.ExerciseSetRepository;
import com.ironmind.workout.repository.SessionExerciseRepository;
import com.ironmind.workout.repository.WorkoutSessionRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class WorkoutSessionServiceTest {

    private static final UUID OWNER_ID = UUID.randomUUID();
    private static final UUID OTHER_USER_ID = UUID.randomUUID();
    private static final UUID PROGRAM_ID = UUID.randomUUID();
    private static final UUID DAY_ID = UUID.randomUUID();
    private static final UUID SESSION_ID = UUID.randomUUID();
    private static final UUID EXERCISE_ID = UUID.randomUUID();
    private static final UUID OTHER_EXERCISE_ID = UUID.randomUUID();

    @Mock
    private WorkoutSessionRepository sessionRepository;

    @Mock
    private SessionExerciseRepository sessionExerciseRepository;

    @Mock
    private ExerciseSetRepository exerciseSetRepository;

    @Mock
    private ProgramDayRepository programDayRepository;

    @Mock
    private ProgramExerciseRepository programExerciseRepository;

    @Mock
    private WorkoutProgramRepository programRepository;

    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private IdempotencyService idempotencyService;

    @InjectMocks
    private WorkoutSessionService workoutSessionService;

    @Test
    @DisplayName("copies the exercises of the program day into the session, in the same order")
    @SuppressWarnings("unchecked")
    void copiesTheExercisesOfTheProgramDayInTheSameOrder() {
        when(programDayRepository.findById(DAY_ID)).thenReturn(Optional.of(day()));
        when(programRepository.findById(PROGRAM_ID)).thenReturn(Optional.of(program(OWNER_ID)));
        when(programExerciseRepository.findByDayIdOrderByPositionAsc(DAY_ID)).thenReturn(List.of(
                new ProgramExercise(UUID.randomUUID(), PROGRAM_ID, DAY_ID, EXERCISE_ID, 1, 4, 6, 8, 150, "Supino"),
                new ProgramExercise(UUID.randomUUID(), PROGRAM_ID, DAY_ID, OTHER_EXERCISE_ID, 2, 3, 8, 12, 120, null)));
        when(sessionRepository.save(any(WorkoutSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionExerciseRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionExerciseRepository.findBySessionIdOrderByPositionAsc(any(UUID.class)))
                .thenReturn(List.of());

        WorkoutSessionService.CreationResult result =
                workoutSessionService.start(new StartSessionRequest(PROGRAM_ID, DAY_ID), OWNER_ID, null);

        ArgumentCaptor<List<SessionExercise>> captor = ArgumentCaptor.forClass(List.class);
        verify(sessionExerciseRepository).saveAll(captor.capture());
        List<SessionExercise> copies = captor.getValue();

        assertThat(copies).hasSize(2);
        assertThat(copies.get(0).getPosition()).isEqualTo(1);
        assertThat(copies.get(0).getExerciseId()).isEqualTo(EXERCISE_ID);
        assertThat(copies.get(0).getNotes()).contains("4x6-8").contains("150s").contains("Supino");
        assertThat(copies.get(1).getPosition()).isEqualTo(2);
        assertThat(copies.get(1).getExerciseId()).isEqualTo(OTHER_EXERCISE_ID);
        assertThat(copies.get(1).getNotes()).contains("3x8-12").contains("120s");

        assertThat(result.created()).isTrue();
        assertThat(result.session().programId()).isEqualTo(PROGRAM_ID);
        assertThat(result.session().programDayId()).isEqualTo(DAY_ID);
        assertThat(result.session().status()).isEqualTo(SessionStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("starts a session without exercises when the request has no program day")
    void startsASessionWithoutExercisesWhenTheRequestHasNoProgramDay() {
        when(sessionRepository.save(any(WorkoutSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionExerciseRepository.findBySessionIdOrderByPositionAsc(any(UUID.class)))
                .thenReturn(List.of());

        WorkoutSessionService.CreationResult result =
                workoutSessionService.start(new StartSessionRequest(null, null), OWNER_ID, null);

        verify(sessionExerciseRepository, never()).saveAll(anyList());
        assertThat(result.session().programId()).isNull();
        assertThat(result.session().programDayId()).isNull();
        assertThat(result.session().exercises()).isEmpty();
    }

    @Test
    @DisplayName("reports a program day of another user as not found")
    void reportsAProgramDayOfAnotherUserAsNotFound() {
        when(programDayRepository.findById(DAY_ID)).thenReturn(Optional.of(day()));
        when(programRepository.findById(PROGRAM_ID)).thenReturn(Optional.of(program(OTHER_USER_ID)));

        assertThatThrownBy(() -> workoutSessionService.start(new StartSessionRequest(PROGRAM_ID, DAY_ID), OWNER_ID, null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("reports a session of another user as not found")
    void reportsASessionOfAnotherUserAsNotFound() {
        when(sessionRepository.findByIdAndUserId(SESSION_ID, OWNER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workoutSessionService.findById(SESSION_ID, OWNER_ID))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> workoutSessionService.requireOwnedSession(SESSION_ID, OWNER_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("refuses to complete a session that is already finished")
    void refusesToCompleteASessionThatIsAlreadyFinished() {
        WorkoutSession finished = session(SessionStatus.COMPLETED);
        when(sessionRepository.findByIdAndUserId(SESSION_ID, OWNER_ID)).thenReturn(Optional.of(finished));

        assertThatThrownBy(() -> workoutSessionService.complete(SESSION_ID, OWNER_ID))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("refuses to change the state of a session that is already finished")
    void refusesToChangeTheStateOfASessionThatIsAlreadyFinished() {
        WorkoutSession finished = session(SessionStatus.ABANDONED);
        when(sessionRepository.findByIdAndUserId(SESSION_ID, OWNER_ID)).thenReturn(Optional.of(finished));

        assertThatThrownBy(() -> workoutSessionService.updateStatus(SESSION_ID,
                new UpdateSessionStatusRequest(SessionStatus.IN_PROGRESS, null), OWNER_ID))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("pauses and resumes a running session")
    void pausesAndResumesARunningSession() {
        WorkoutSession running = session(SessionStatus.IN_PROGRESS);
        when(sessionRepository.findByIdAndUserId(SESSION_ID, OWNER_ID)).thenReturn(Optional.of(running));
        when(sessionRepository.save(any(WorkoutSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionExerciseRepository.findBySessionIdOrderByPositionAsc(SESSION_ID)).thenReturn(List.of());

        SessionResponse paused = workoutSessionService.updateStatus(SESSION_ID,
                new UpdateSessionStatusRequest(SessionStatus.PAUSED, null), OWNER_ID);
        assertThat(paused.status()).isEqualTo(SessionStatus.PAUSED);

        SessionResponse resumed = workoutSessionService.updateStatus(SESSION_ID,
                new UpdateSessionStatusRequest(SessionStatus.IN_PROGRESS, null), OWNER_ID);
        assertThat(resumed.status()).isEqualTo(SessionStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("completes a running session and stamps the moment it ended")
    void completesARunningSessionAndStampsTheMomentItEnded() {
        WorkoutSession running = session(SessionStatus.IN_PROGRESS);
        when(sessionRepository.findByIdAndUserId(SESSION_ID, OWNER_ID)).thenReturn(Optional.of(running));
        when(sessionRepository.save(any(WorkoutSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionExerciseRepository.findBySessionIdOrderByPositionAsc(SESSION_ID)).thenReturn(List.of());

        SessionResponse completed = workoutSessionService.complete(SESSION_ID, OWNER_ID);

        assertThat(completed.status()).isEqualTo(SessionStatus.COMPLETED);
        assertThat(completed.completedAt()).isNotNull();
    }

    @Test
    @DisplayName("replays the addition of an exercise with the same idempotency key without creating another")
    void replaysTheAdditionOfAnExerciseWithTheSameKey() {
        UUID sessionExerciseId = UUID.randomUUID();
        WorkoutSession running = session(SessionStatus.IN_PROGRESS);
        SessionExercise replayed = new SessionExercise(sessionExerciseId, SESSION_ID, EXERCISE_ID, 1, null);
        Exercise exercise = new Exercise(EXERCISE_ID, "Supino", null, "PEITO", List.of(), "Barra", null,
                MovementType.COMPOUND);

        when(sessionRepository.findByIdAndUserId(SESSION_ID, OWNER_ID)).thenReturn(Optional.of(running));
        when(idempotencyService.findExistingResource(any(), eq("replay-key"), eq(OWNER_ID), any()))
                .thenReturn(Optional.of(sessionExerciseId));
        when(sessionExerciseRepository.findById(sessionExerciseId)).thenReturn(Optional.of(replayed));
        when(exerciseRepository.findById(EXERCISE_ID)).thenReturn(Optional.of(exercise));

        WorkoutSessionService.ExerciseAddition addition = workoutSessionService.addExercise(SESSION_ID,
                new AddSessionExerciseRequest(EXERCISE_ID, null, null), OWNER_ID, "replay-key");

        assertThat(addition.created()).isFalse();
        assertThat(addition.exercise().id()).isEqualTo(sessionExerciseId);
        verify(sessionExerciseRepository, never()).save(any(SessionExercise.class));
    }

    @Test
    @DisplayName("refuses to add an exercise to a session that is already finished")
    void refusesToAddAnExerciseToASessionThatIsAlreadyFinished() {
        WorkoutSession finished = session(SessionStatus.COMPLETED);
        when(sessionRepository.findByIdAndUserId(SESSION_ID, OWNER_ID)).thenReturn(Optional.of(finished));

        assertThatThrownBy(() -> workoutSessionService.addExercise(SESSION_ID,
                new AddSessionExerciseRequest(EXERCISE_ID, null, null), OWNER_ID, null))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("refuses an exercise that does not exist in the catalog")
    void refusesAnExerciseThatDoesNotExistInTheCatalog() {
        WorkoutSession running = session(SessionStatus.IN_PROGRESS);
        when(sessionRepository.findByIdAndUserId(SESSION_ID, OWNER_ID)).thenReturn(Optional.of(running));
        when(exerciseRepository.findById(EXERCISE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workoutSessionService.addExercise(SESSION_ID,
                new AddSessionExerciseRequest(EXERCISE_ID, null, null), OWNER_ID, null))
                .isInstanceOf(com.ironmind.common.exception.FieldValidationException.class);
    }

    @Test
    @DisplayName("lists only the sessions of the authenticated user")
    void listsOnlyTheSessionsOfTheAuthenticatedUser() {
        when(sessionRepository.findByUserId(eq(OWNER_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        assertThat(workoutSessionService.list(0, 20, null, OWNER_ID).content()).isEmpty();
        verify(sessionRepository).findByUserId(eq(OWNER_ID), any(Pageable.class));
    }

    private static WorkoutProgram program(UUID ownerId) {
        return new WorkoutProgram(PROGRAM_ID, ownerId, "Push / Pull / Legs", "Divisão de 3 dias",
                TrainingGoal.HYPERTROPHY, SplitType.PPL);
    }

    private static ProgramDay day() {
        return new ProgramDay(DAY_ID, PROGRAM_ID, "Peito e tríceps", 1);
    }

    private static WorkoutSession session(SessionStatus status) {
        return new WorkoutSession(SESSION_ID, OWNER_ID, null, null, java.time.Instant.now(), status);
    }
}
