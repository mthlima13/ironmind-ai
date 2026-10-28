package com.ironmind.workout;

import com.ironmind.common.security.SecurityUtils;
import com.ironmind.common.web.PageResponse;
import com.ironmind.workout.dto.AddSessionExerciseRequest;
import com.ironmind.workout.dto.SessionExerciseResponse;
import com.ironmind.workout.dto.SessionResponse;
import com.ironmind.workout.dto.StartSessionRequest;
import com.ironmind.workout.dto.UpdateSessionStatusRequest;
import com.ironmind.workout.service.WorkoutSessionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints of the training sessions (SPEC.md section 11.4).
 *
 * <p>The owner always comes from the identity header: the body of the request never identifies the
 * user, and a session of another user is answered with {@code 404}.
 */
@RestController
@RequestMapping("/api/v1/workout-sessions")
@Tag(name = "Workout sessions", description = "Sessões de treino, exercícios e séries")
@Validated
public class WorkoutSessionController {

    private final WorkoutSessionService workoutSessionService;

    public WorkoutSessionController(WorkoutSessionService workoutSessionService) {
        this.workoutSessionService = workoutSessionService;
    }

    @GetMapping
    @Operation(summary = "Lista as sessões do usuário",
            description = "Retorna o histórico paginado das sessões do titular da requisição, com os exercícios "
                    + "e as séries embutidos. A ordenação padrão é por início, do mais recente para o mais antigo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Página de sessões"),
            @ApiResponse(responseCode = "401", description = "Header de identidade ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "422", description = "Parâmetros de paginação inválidos", content = @Content)
    })
    public PageResponse<SessionResponse> list(
            @RequestParam(defaultValue = "0") @Parameter(description = "Índice da página, começando em zero.")
            @Min(value = 0, message = "O índice da página deve ser maior ou igual a zero.")
            int page,
            @RequestParam(defaultValue = "20") @Parameter(description = "Tamanho da página, no máximo 100.")
            @Min(value = 1, message = "O tamanho da página deve ser no mínimo 1.")
            @Max(value = PageResponse.MAX_PAGE_SIZE, message = "O tamanho da página deve ser no máximo 100.")
            int size,
            @RequestParam(required = false) @Parameter(description = "Ordenação, por exemplo startedAt,desc.")
            String sort) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return workoutSessionService.list(page, size, sort, userId);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulta uma sessão",
            description = "Devolve a sessão com os exercícios e as séries embutidos.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sessão encontrada"),
            @ApiResponse(responseCode = "401", description = "Header de identidade ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Sessão inexistente ou de outro usuário",
                    content = @Content)
    })
    public SessionResponse findById(@PathVariable UUID id) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return workoutSessionService.findById(id, userId);
    }

    @PostMapping
    @Operation(summary = "Inicia uma sessão",
            description = "O dono da sessão é sempre o titular da requisição. Quando um dia de programa é informado, "
                    + "os exercícios do dia são copiados para a sessão, na mesma ordem, e a resposta já traz a "
                    + "sessão com os exercícios. Uma sessão sem dia começa sem exercícios. Aceita o header "
                    + "Idempotency-Key.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Sessão criada"),
            @ApiResponse(responseCode = "200", description = "Sessão criada por uma requisição anterior com a mesma chave"),
            @ApiResponse(responseCode = "401", description = "Header de identidade ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Programa ou dia inexistente ou de outro usuário",
                    content = @Content),
            @ApiResponse(responseCode = "409", description = "Chave de idempotência reutilizada com outro conteúdo", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public ResponseEntity<SessionResponse> start(
            @Valid @RequestBody StartSessionRequest request,
            @Parameter(in = ParameterIn.HEADER, name = "Idempotency-Key",
                    description = "Chave de idempotência da operação.")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        WorkoutSessionService.CreationResult result = workoutSessionService.start(request, userId, idempotencyKey);
        if (!result.created()) {
            return ResponseEntity.ok(result.session());
        }
        URI location = URI.create("/api/v1/workout-sessions/" + result.session().id());
        return ResponseEntity.created(location).body(result.session());
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Muda o estado da sessão",
            description = "Pausa, retoma ou abandona a sessão. Uma sessão concluída ou abandonada é imutável e "
                    + "não aceita mudanças de estado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sessão atualizada"),
            @ApiResponse(responseCode = "401", description = "Header de identidade ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Sessão inexistente ou de outro usuário",
                    content = @Content),
            @ApiResponse(responseCode = "409", description = "A sessão já foi finalizada", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public SessionResponse updateStatus(@PathVariable UUID id,
            @Valid @RequestBody UpdateSessionStatusRequest request) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return workoutSessionService.updateStatus(id, request, userId);
    }

    @PostMapping("/{id}/exercises")
    @Operation(summary = "Adiciona um exercício à sessão",
            description = "Adiciona um exercício do catálogo à sessão, na posição informada. O mesmo exercício não "
                    + "entra duas vezes na mesma sessão. Aceita o header Idempotency-Key.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Exercício adicionado à sessão"),
            @ApiResponse(responseCode = "200", description = "Exercício adicionado por uma requisição anterior com a mesma chave"),
            @ApiResponse(responseCode = "401", description = "Header de identidade ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Sessão inexistente ou de outro usuário",
                    content = @Content),
            @ApiResponse(responseCode = "409", description = "Exercício já presente na sessão ou sessão finalizada",
                    content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public ResponseEntity<SessionExerciseResponse> addExercise(@PathVariable UUID id,
            @Valid @RequestBody AddSessionExerciseRequest request,
            @Parameter(in = ParameterIn.HEADER, name = "Idempotency-Key",
                    description = "Chave de idempotência da operação.")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        WorkoutSessionService.ExerciseAddition addition
                = workoutSessionService.addExercise(id, request, userId, idempotencyKey);
        if (!addition.created()) {
            return ResponseEntity.ok(addition.exercise());
        }
        URI location = URI.create("/api/v1/workout-sessions/" + id + "/exercises/" + addition.exercise().id());
        return ResponseEntity.created(location).body(addition.exercise());
    }

    @PostMapping("/{id}/complete")
    @Operation(summary = "Conclui a sessão",
            description = "Marca a sessão como concluída e preenche o instante do fim. Uma sessão já finalizada "
                    + "não pode ser concluída de novo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sessão concluída"),
            @ApiResponse(responseCode = "401", description = "Header de identidade ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Sessão inexistente ou de outro usuário",
                    content = @Content),
            @ApiResponse(responseCode = "409", description = "A sessão já foi finalizada", content = @Content)
    })
    public SessionResponse complete(@PathVariable UUID id) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return workoutSessionService.complete(id, userId);
    }
}
