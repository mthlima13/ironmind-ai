package com.ironmind.exercise.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ironmind.common.exception.IdempotencyKeyReusedException;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.common.idempotency.IdempotencyService;
import com.ironmind.common.web.PageResponse;
import com.ironmind.exercise.dto.CreateExerciseRequest;
import com.ironmind.exercise.dto.ExerciseQuery;
import com.ironmind.exercise.dto.ExerciseResponse;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.exercise.repository.ExerciseRepository;
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
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

@ExtendWith(MockitoExtension.class)
class ExerciseServiceTest {

    private static final UUID OWNER_ID = UUID.randomUUID();
    private static final UUID OTHER_USER_ID = UUID.randomUUID();

    @Mock
    private ExerciseRepository exerciseRepository;

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private IdempotencyService idempotencyService;

    @InjectMocks
    private ExerciseService exerciseService;

    @Test
    @DisplayName("creates a personal exercise owned by the authenticated user")
    void createsPersonalExerciseOwnedByTheAuthenticatedUser() {
        CreateExerciseRequest request = request("Supino reto com barra");
        when(exerciseRepository.save(any(Exercise.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExerciseService.CreationResult result = exerciseService.create(request, OWNER_ID, null);

        ArgumentCaptor<Exercise> captor = ArgumentCaptor.forClass(Exercise.class);
        verify(exerciseRepository).save(captor.capture());
        Exercise saved = captor.getValue();
        assertThat(saved.getCreatedByUserId()).isEqualTo(OWNER_ID);
        assertThat(saved.isSystem()).isFalse();
        assertThat(result.created()).isTrue();
        assertThat(result.exercise().createdByUserId()).isEqualTo(OWNER_ID);
    }

    @Test
    @DisplayName("returns the previous result when the idempotency key is replayed")
    void returnsThePreviousResultWhenTheIdempotencyKeyIsReplayed() {
        UUID existingId = UUID.randomUUID();
        Exercise existing = personalExercise(existingId, OWNER_ID);
        when(exerciseRepository.findById(existingId)).thenReturn(Optional.of(existing));
        when(idempotencyService.findExistingResource(anyString(), eq("key-1"), eq(OWNER_ID), anyString()))
                .thenReturn(Optional.of(existingId));

        ExerciseService.CreationResult result = exerciseService.create(request("Supino reto com barra"), OWNER_ID, "key-1");

        assertThat(result.created()).isFalse();
        assertThat(result.exercise().id()).isEqualTo(existingId);
        verify(exerciseRepository, never()).save(any(Exercise.class));
    }

    @Test
    @DisplayName("fails when the idempotency key is reused with a different payload")
    void failsWhenTheIdempotencyKeyIsReusedWithADifferentPayload() {
        when(idempotencyService.findExistingResource(anyString(), eq("key-1"), eq(OWNER_ID), anyString()))
                .thenThrow(new IdempotencyKeyReusedException("Chave reutilizada."));

        assertThatThrownBy(() -> exerciseService.create(request("Supino reto com barra"), OWNER_ID, "key-1"))
                .isInstanceOf(IdempotencyKeyReusedException.class);
        verify(exerciseRepository, never()).save(any(Exercise.class));
    }

    @Test
    @DisplayName("reports an exercise of another user as not found")
    void reportsAnExerciseOfAnotherUserAsNotFound() {
        UUID id = UUID.randomUUID();
        when(exerciseRepository.findById(id)).thenReturn(Optional.of(personalExercise(id, OTHER_USER_ID)));

        assertThatThrownBy(() -> exerciseService.findById(id, OWNER_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("lists the exercises visible to the user")
    void listsTheVisibleExercises() {
        Exercise system = new Exercise(UUID.randomUUID(), "Agachamento livre com barra", null, "Quadríceps",
                List.of(), "Barra", null, MovementType.COMPOUND);
        Exercise personal = personalExercise(UUID.randomUUID(), OWNER_ID);
        when(mongoTemplate.find(any(Query.class), eq(Exercise.class)))
                .thenReturn(List.of(system, personal));
        when(mongoTemplate.count(any(Query.class), eq(Exercise.class))).thenReturn(2L);

        PageResponse<ExerciseResponse> page = exerciseService.list(
                new ExerciseQuery(0, 20, "name", null, null, null, false), OWNER_ID);

        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.content()).hasSize(2);
        assertThat(page.content().get(0).id()).isEqualTo(system.getId());
    }

    private static CreateExerciseRequest request(String name) {
        return new CreateExerciseRequest(name, "Descrição", "Peito", List.of("Tríceps"), "Barra",
                "Instruções", MovementType.COMPOUND);
    }

    private static Exercise personalExercise(UUID id, UUID ownerId) {
        return new Exercise(id, "Supino inclinado com halteres", null, "Peito", List.of(), "Halteres", null,
                MovementType.COMPOUND, ownerId);
    }
}
