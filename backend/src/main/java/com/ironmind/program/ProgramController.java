package com.ironmind.program;

import com.ironmind.common.security.SecurityUtils;
import com.ironmind.common.web.PageResponse;
import com.ironmind.program.dto.CreateProgramRequest;
import com.ironmind.program.dto.ProgramResponse;
import com.ironmind.program.service.ProgramService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints of the training programs (SPEC.md section 11.3).
 *
 * <p>The owner always comes from the access token: the body of the request never identifies the
 * user, and a program of another user is answered with {@code 404}.
 */
@RestController
@RequestMapping("/api/v1/programs")
@Tag(name = "Programs", description = "Programas de treino do usuário autenticado")
@Validated
public class ProgramController {

    private final ProgramService programService;

    public ProgramController(ProgramService programService) {
        this.programService = programService;
    }

    @GetMapping
    @Operation(summary = "Lista os programas do usuário",
            description = "Retorna os programas do usuário autenticado, com os dias e os exercícios. "
                    + "Os programas arquivados ficam de fora da listagem, salvo quando o parâmetro "
                    + "includeArchived é verdadeiro.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Página de programas"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "422", description = "Parâmetros de paginação inválidos", content = @Content)
    })
    public PageResponse<ProgramResponse> list(
            @RequestParam(defaultValue = "0") @Parameter(description = "Índice da página, começando em zero.")
            @Min(value = 0, message = "O índice da página deve ser maior ou igual a zero.")
            int page,
            @RequestParam(defaultValue = "20") @Parameter(description = "Tamanho da página, no máximo 100.")
            @Min(value = 1, message = "O tamanho da página deve ser no mínimo 1.")
            @Max(value = PageResponse.MAX_PAGE_SIZE, message = "O tamanho da página deve ser no máximo 100.")
            int size,
            @RequestParam(required = false) @Parameter(description = "Ordenação, por exemplo name,asc.")
            String sort,
            @RequestParam(defaultValue = "false") @Parameter(description = "Lista também os programas arquivados.")
            boolean includeArchived) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return programService.list(page, size, sort, includeArchived, userId);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulta um programa",
            description = "Devolve o programa com os dias e os exercícios. Um programa arquivado continua acessível.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Programa encontrado"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Programa inexistente ou de outro usuário",
                    content = @Content)
    })
    public ProgramResponse findById(@PathVariable UUID id) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return programService.findById(id, userId);
    }

    @PostMapping
    @Operation(summary = "Cria um programa",
            description = "O dono do programa é sempre o usuário autenticado. Os dias e os exercícios são "
                    + "gravados na ordem do corpo. Aceita o header Idempotency-Key.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Programa criado"),
            @ApiResponse(responseCode = "200", description = "Programa criado por uma requisição anterior com a mesma chave"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "409", description = "Chave de idempotência reutilizada com outro conteúdo", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public ResponseEntity<ProgramResponse> create(
            @Valid @RequestBody CreateProgramRequest request,
            @Parameter(in = ParameterIn.HEADER, name = "Idempotency-Key",
                    description = "Chave de idempotência da operação.")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        ProgramService.CreationResult result = programService.create(request, userId, idempotencyKey);
        if (!result.created()) {
            return ResponseEntity.ok(result.program());
        }
        URI location = URI.create("/api/v1/programs/" + result.program().id());
        return ResponseEntity.created(location).body(result.program());
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualiza um programa",
            description = "Substitui o conteúdo e a estrutura do programa: os dias e os exercícios enviados "
                    + "trocam os que estão gravados, e as posições seguem a ordem do corpo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Programa atualizado"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Programa inexistente ou de outro usuário",
                    content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public ProgramResponse update(@PathVariable UUID id, @Valid @RequestBody CreateProgramRequest request) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return programService.update(id, request, userId);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Arquiva um programa",
            description = "Arquiva o programa em vez de apagá-lo: ele sai da listagem, mas continua acessível "
                    + "pela consulta do identificador.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Programa arquivado"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Programa inexistente ou de outro usuário",
                    content = @Content)
    })
    public ResponseEntity<Void> archive(@PathVariable UUID id) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        programService.archive(id, userId);
        return ResponseEntity.noContent().build();
    }
}
