package com.ironmind.exercise;

import com.ironmind.common.exception.UnauthenticatedException;
import com.ironmind.common.security.SecurityUtils;
import com.ironmind.common.web.PageResponse;
import com.ironmind.exercise.dto.CreateExerciseRequest;
import com.ironmind.exercise.dto.ExerciseQuery;
import com.ironmind.exercise.dto.ExerciseResponse;
import com.ironmind.exercise.dto.UpdateExerciseRequest;
import com.ironmind.exercise.service.ExerciseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
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
 * Endpoints of the exercise catalog (SPEC.md section 11.2).
 */
@RestController
@RequestMapping("/api/v1/exercises")
@Tag(name = "Exercises", description = "Catálogo de exercícios do sistema e exercícios personalizados do usuário")
public class ExerciseController {

    private final ExerciseService exerciseService;

    public ExerciseController(ExerciseService exerciseService) {
        this.exerciseService = exerciseService;
    }

    @GetMapping
    @Operation(summary = "Lista e filtra exercícios",
            description = "Retorna os exercícios do catálogo global e os exercícios pessoais do usuário autenticado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Página de exercícios")
    })
    public PageResponse<ExerciseResponse> list(
            @RequestParam(defaultValue = "0") @Parameter(description = "Índice da página, começando em zero.")
            int page,
            @RequestParam(defaultValue = "20") @Parameter(description = "Tamanho da página, no máximo 100.")
            int size,
            @RequestParam(required = false) @Parameter(description = "Ordenação, por exemplo name,asc.")
            String sort,
            @RequestParam(required = false) @Parameter(description = "Filtra pelo grupo muscular principal.")
            String muscleGroup,
            @RequestParam(required = false) @Parameter(description = "Filtra pelo equipamento.")
            String equipment,
            @RequestParam(required = false) @Parameter(description = "Busca textual no nome do exercício.")
            String search,
            @RequestParam(defaultValue = "false") @Parameter(description = "Lista apenas os exercícios pessoais do usuário.")
            boolean onlyMine) {
        UUID userId = SecurityUtils.currentUserId().orElse(null);
        if (onlyMine && userId == null) {
            throw new UnauthenticatedException("Autenticação necessária para listar os exercícios pessoais.");
        }
        ExerciseQuery query = new ExerciseQuery(page, size, sort, muscleGroup, equipment, search, onlyMine);
        return exerciseService.list(query, userId);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulta um exercício")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Exercício encontrado"),
            @ApiResponse(responseCode = "404", description = "Exercício inexistente ou de outro usuário",
                    content = @Content)
    })
    public ExerciseResponse findById(@PathVariable UUID id) {
        return exerciseService.findById(id, SecurityUtils.currentUserId().orElse(null));
    }

    @PostMapping
    @Operation(summary = "Cria um exercício personalizado",
            description = "O dono do exercício é sempre o usuário autenticado. Aceita o header Idempotency-Key.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Exercício criado"),
            @ApiResponse(responseCode = "200", description = "Exercício criado por uma requisição anterior com a mesma chave"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "409", description = "Chave de idempotência reutilizada com outro conteúdo", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public ResponseEntity<ExerciseResponse> create(
            @Valid @RequestBody CreateExerciseRequest request,
            @Parameter(in = ParameterIn.HEADER, name = "Idempotency-Key",
                    description = "Chave de idempotência da operação.")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        ExerciseService.CreationResult result = exerciseService.create(request, userId, idempotencyKey);
        if (!result.created()) {
            return ResponseEntity.ok(result.exercise());
        }
        URI location = URI.create("/api/v1/exercises/" + result.exercise().id());
        return ResponseEntity.created(location).body(result.exercise());
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Atualiza um exercício pessoal")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Exercício atualizado"),
            @ApiResponse(responseCode = "404", description = "Exercício inexistente ou de outro usuário", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public ExerciseResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateExerciseRequest request) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return exerciseService.update(id, request, userId);
    }
}
