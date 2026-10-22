package com.ironmind.program.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ironmind.common.exception.FieldValidationException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.common.idempotency.IdempotencyService;
import com.ironmind.common.web.PageResponse;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.program.dto.CreateProgramRequest;
import com.ironmind.program.dto.ProgramDayRequest;
import com.ironmind.program.dto.ProgramExerciseRequest;
import com.ironmind.program.dto.ProgramResponse;
import com.ironmind.program.entity.ProgramDay;
import com.ironmind.program.entity.ProgramExercise;
import com.ironmind.program.entity.SplitType;
import com.ironmind.program.entity.WorkoutProgram;
import com.ironmind.program.repository.ProgramDayRepository;
import com.ironmind.program.repository.ProgramExerciseRepository;
import com.ironmind.program.repository.WorkoutProgramRepository;
import com.ironmind.user.entity.TrainingGoal;
import com.ironmind.user.entity.User;
import com.ironmind.user.entity.UserRole;
import com.ironmind.user.repository.UserRepository;
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
class ProgramServiceTest {

    private static final UUID OWNER_ID = UUID.randomUUID();
    private static final UUID OTHER_USER_ID = UUID.randomUUID();
    private static final UUID PROGRAM_ID = UUID.randomUUID();
    private static final UUID EXERCISE_ID = UUID.randomUUID();
    private static final UUID MISSING_EXERCISE_ID = UUID.randomUUID();

    @Mock
    private WorkoutProgramRepository programRepository;

    @Mock
    private ProgramDayRepository programDayRepository;

    @Mock
    private ProgramExerciseRepository programExerciseRepository;

    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private IdempotencyService idempotencyService;

    @InjectMocks
    private ProgramService programService;

    @Test
    @DisplayName("creates the program with the days and the exercises in the order of the request")
    @SuppressWarnings("unchecked")
    void createsTheProgramWithTheDaysAndTheExercisesInTheOrderOfTheRequest() {
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner(OWNER_ID)));
        when(exerciseRepository.findById(EXERCISE_ID)).thenReturn(Optional.of(catalogExercise()));
        when(programRepository.save(any(WorkoutProgram.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(programDayRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(programExerciseRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        ProgramService.CreationResult result = programService.create(request(), OWNER_ID, null);

        ArgumentCaptor<List<ProgramDay>> daysCaptor = ArgumentCaptor.forClass(List.class);
        verify(programDayRepository).saveAll(daysCaptor.capture());
        List<ProgramDay> days = daysCaptor.getValue();
        assertThat(days).hasSize(2);
        assertThat(days.get(0).getName()).isEqualTo("Peito e tríceps");
        assertThat(days.get(0).getPosition()).isEqualTo(1);
        assertThat(days.get(1).getName()).isEqualTo("Costas");
        assertThat(days.get(1).getPosition()).isEqualTo(2);

        ArgumentCaptor<List<ProgramExercise>> exercisesCaptor = ArgumentCaptor.forClass(List.class);
        verify(programExerciseRepository).saveAll(exercisesCaptor.capture());
        List<ProgramExercise> exercises = exercisesCaptor.getValue();
        assertThat(exercises).hasSize(3);
        assertThat(exercises.get(0).getPosition()).isEqualTo(1);
        assertThat(exercises.get(1).getPosition()).isEqualTo(2);
        assertThat(exercises.get(2).getPosition()).isEqualTo(1);
        assertThat(exercises.get(0).getExercise().getId()).isEqualTo(EXERCISE_ID);
        assertThat(exercises.get(0).getDay().getId()).isEqualTo(days.get(0).getId());

        assertThat(result.created()).isTrue();
        assertThat(result.program().name()).isEqualTo("Push / Pull / Legs");
        assertThat(result.program().goal()).isEqualTo(TrainingGoal.HYPERTROPHY);
        assertThat(result.program().splitType()).isEqualTo(SplitType.PPL);
        assertThat(result.program().isArchived()).isFalse();
        assertThat(result.program().days()).hasSize(2);
        assertThat(result.program().days().get(0).exercises()).hasSize(2);
        assertThat(result.program().days().get(1).exercises()).hasSize(1);
    }

    @Test
    @DisplayName("replaces the structure of the program on update")
    @SuppressWarnings("unchecked")
    void replacesTheStructureOfTheProgramOnUpdate() {
        when(programRepository.findById(PROGRAM_ID)).thenReturn(Optional.of(program(OWNER_ID)));
        when(exerciseRepository.findById(EXERCISE_ID)).thenReturn(Optional.of(catalogExercise()));
        when(programRepository.save(any(WorkoutProgram.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(programDayRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        when(programExerciseRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        ProgramResponse response = programService.update(PROGRAM_ID, requestWithASingleDay(), OWNER_ID);

        verify(programExerciseRepository).deleteAllByProgramId(PROGRAM_ID);
        verify(programDayRepository).deleteAllByProgramId(PROGRAM_ID);

        ArgumentCaptor<List<ProgramDay>> daysCaptor = ArgumentCaptor.forClass(List.class);
        verify(programDayRepository).saveAll(daysCaptor.capture());
        List<ProgramDay> days = daysCaptor.getValue();
        assertThat(days).hasSize(1);
        assertThat(days.get(0).getName()).isEqualTo("Costas");
        assertThat(days.get(0).getPosition()).isEqualTo(1);

        assertThat(response.days()).hasSize(1);
        assertThat(response.days().get(0).name()).isEqualTo("Costas");
        assertThat(response.days().get(0).position()).isEqualTo(1);
        assertThat(response.days().get(0).exercises()).hasSize(1);
    }

    @Test
    @DisplayName("refuses an exercise that does not exist in the catalog")
    void refusesAnExerciseThatDoesNotExistInTheCatalog() {
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner(OWNER_ID)));
        when(exerciseRepository.findById(EXERCISE_ID)).thenReturn(Optional.of(catalogExercise()));
        when(exerciseRepository.findById(MISSING_EXERCISE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> programService.create(requestWithAMissingExercise(), OWNER_ID, null))
                .isInstanceOf(FieldValidationException.class)
                .satisfies(exception -> assertThat(((FieldValidationException) exception).getFieldErrors())
                        .singleElement()
                        .satisfies(fieldError -> assertThat(fieldError.field())
                                .isEqualTo("days[0].exercises[1].exerciseId")));
    }

    @Test
    @DisplayName("refuses a repetition range that ends before it starts")
    void refusesARepetitionRangeThatEndsBeforeItStarts() {
        when(userRepository.findById(OWNER_ID)).thenReturn(Optional.of(owner(OWNER_ID)));

        assertThatThrownBy(() -> programService.create(requestWithAnInvertedRepetitionRange(), OWNER_ID, null))
                .isInstanceOf(FieldValidationException.class)
                .satisfies(exception -> assertThat(((FieldValidationException) exception).getFieldErrors())
                        .singleElement()
                        .satisfies(fieldError -> assertThat(fieldError.field())
                                .isEqualTo("days[0].exercises[0].targetRepsMax")));
    }

    @Test
    @DisplayName("archives the program and keeps it out of the listing")
    void archivesTheProgramAndKeepsItOutOfTheListing() {
        WorkoutProgram program = program(OWNER_ID);
        when(programRepository.findById(PROGRAM_ID)).thenReturn(Optional.of(program));
        when(programRepository.save(any(WorkoutProgram.class))).thenAnswer(invocation -> invocation.getArgument(0));

        programService.archive(PROGRAM_ID, OWNER_ID);

        assertThat(program.isArchived()).isTrue();
        verify(programRepository).save(program);
    }

    @Test
    @DisplayName("leaves the archived programs out of the default listing")
    void leavesTheArchivedProgramsOutOfTheDefaultListing() {
        when(programRepository.findActiveByUser(eq(OWNER_ID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        PageResponse<ProgramResponse> page = programService.list(0, 20, null, false, OWNER_ID);

        assertThat(page.content()).isEmpty();
        assertThat(page.totalElements()).isZero();
        verify(programRepository).findActiveByUser(eq(OWNER_ID), any(Pageable.class));
        verify(programRepository, never()).findAllByUser(any(UUID.class), any(Pageable.class));
    }

    @Test
    @DisplayName("reports a program of another user as not found")
    void reportsAProgramOfAnotherUserAsNotFound() {
        when(programRepository.findById(PROGRAM_ID)).thenReturn(Optional.of(program(OTHER_USER_ID)));

        assertThatThrownBy(() -> programService.findById(PROGRAM_ID, OWNER_ID))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> programService.update(PROGRAM_ID, request(), OWNER_ID))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> programService.archive(PROGRAM_ID, OWNER_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private static CreateProgramRequest request() {
        return new CreateProgramRequest(
                "Push / Pull / Legs",
                "Divisão de 3 dias",
                TrainingGoal.HYPERTROPHY,
                SplitType.PPL,
                List.of(
                        new ProgramDayRequest("Peito e tríceps", List.of(
                                exercise(EXERCISE_ID, 4, 6, 8, 150),
                                exercise(EXERCISE_ID, 3, 8, 12, 120))),
                        new ProgramDayRequest("Costas", List.of(
                                exercise(EXERCISE_ID, 4, 8, 12, 120)))));
    }

    private static CreateProgramRequest requestWithASingleDay() {
        return new CreateProgramRequest(
                "Costas e bíceps",
                "Só costas",
                TrainingGoal.STRENGTH,
                SplitType.CUSTOM,
                List.of(new ProgramDayRequest("Costas", List.of(
                        exercise(EXERCISE_ID, 4, 8, 12, 120)))));
    }

    private static CreateProgramRequest requestWithAMissingExercise() {
        return new CreateProgramRequest(
                "Push / Pull / Legs",
                "Divisão de 3 dias",
                TrainingGoal.HYPERTROPHY,
                SplitType.PPL,
                List.of(new ProgramDayRequest("Peito e tríceps", List.of(
                        exercise(EXERCISE_ID, 3, 8, 12, 120),
                        exercise(MISSING_EXERCISE_ID, 3, 8, 12, 120)))));
    }

    private static CreateProgramRequest requestWithAnInvertedRepetitionRange() {
        return new CreateProgramRequest(
                "Push / Pull / Legs",
                "Divisão de 3 dias",
                TrainingGoal.HYPERTROPHY,
                SplitType.PPL,
                List.of(new ProgramDayRequest("Peito e tríceps", List.of(
                        new ProgramExerciseRequest(EXERCISE_ID, 3, 12, 8, 120, null)))));
    }

    private static ProgramExerciseRequest exercise(UUID exerciseId, int sets, int repsMin, int repsMax, int rest) {
        return new ProgramExerciseRequest(exerciseId, sets, repsMin, repsMax, rest, null);
    }

    private static WorkoutProgram program(UUID ownerId) {
        return new WorkoutProgram(PROGRAM_ID, owner(ownerId), "Push / Pull / Legs", "Divisão de 3 dias",
                TrainingGoal.HYPERTROPHY, SplitType.PPL);
    }

    private static User owner(UUID id) {
        return new User(id, "Ana Souza", "ana@example.com", "hash", UserRole.USER, "America/Sao_Paulo");
    }

    private static Exercise catalogExercise() {
        return new Exercise(EXERCISE_ID, "Supino reto com barra", null, "Peito", List.of(), "Barra", null,
                MovementType.COMPOUND);
    }
}
