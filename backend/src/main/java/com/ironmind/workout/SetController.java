package com.ironmind.workout;

import com.ironmind.common.security.SecurityUtils;
import com.ironmind.workout.dto.ExerciseSetResponse;
import com.ironmind.workout.dto.RegisterSetRequest;
import com.ironmind.workout.dto.UpdateSetRequest;
import com.ironmind.workout.service.ExerciseSetService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints of the sets registered in the sessions (SPEC.md section 11.4).
 *
 * <p>The owner always comes from the access token: a series of another user is answered with
 * {@code 404}.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "Sets", description = "Séries registradas dentro das sessões de treino")
public class SetController {

    private final ExerciseSetService exerciseSetService;

    public SetController(ExerciseSetService exerciseSetService) {
        this.exerciseSetService = exerciseSetService;
    }

    @PostMapping("/workout-sessions/{id}/sets")
    @Operation(summary = "Registra uma série",
            description = "Registra uma série dentro de um exercício da sessão. O número da série é atribuído pelo "
                    + "servidor: ele é a posição da série dentro do exercício. A chave de idempotência é durável: "
                    + "repetir a requisição com a mesma chave e o mesmo corpo devolve a mesma série.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Série registrada"),
            @ApiResponse(responseCode = "200", description = "Série registrada por uma requisição anterior com a mesma chave"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Sessão ou exercício da sessão inexistente, ou de outro usuário",
                    content = @Content),
            @ApiResponse(responseCode = "409", description = "Sessão finalizada ou chave de idempotência reutilizada com outro conteúdo",
                    content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public ResponseEntity<ExerciseSetResponse> register(@PathVariable UUID id,
            @Valid @RequestBody RegisterSetRequest request,
            @Parameter(in = ParameterIn.HEADER, name = "Idempotency-Key",
                    description = "Chave de idempotência da operação.")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        ExerciseSetService.RegistrationResult result =
                exerciseSetService.register(id, request, userId, idempotencyKey);
        if (!result.created()) {
            return ResponseEntity.ok(result.set());
        }
        URI location = URI.create("/api/v1/sets/" + result.set().id());
        return ResponseEntity.created(location).body(result.set());
    }

    @PatchMapping("/sets/{id}")
    @Operation(summary = "Corrige uma série",
            description = "Corrige os valores de uma série já registrada. A correção mantém o identificador e o "
                    + "número da série.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Série corrigida"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Série inexistente ou de outro usuário", content = @Content),
            @ApiResponse(responseCode = "409", description = "A sessão da série já foi finalizada", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public ExerciseSetResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateSetRequest request) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return exerciseSetService.update(id, request, userId);
    }

    @DeleteMapping("/sets/{id}")
    @Operation(summary = "Exclui uma série",
            description = "Exclui uma série registrada e reavalia os recordes derivados de forma transacional.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Série excluída"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Série inexistente ou de outro usuário", content = @Content),
            @ApiResponse(responseCode = "409", description = "A sessão da série já foi finalizada", content = @Content)
    })
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        exerciseSetService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
