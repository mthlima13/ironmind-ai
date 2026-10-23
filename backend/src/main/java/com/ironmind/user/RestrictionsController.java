package com.ironmind.user;

import com.ironmind.common.security.SecurityUtils;
import com.ironmind.user.dto.InjuryRestrictionResponse;
import com.ironmind.user.dto.UpdateRestrictionsRequest;
import com.ironmind.user.service.RestrictionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints of injury restrictions (SPEC.md section 11.5).
 *
 * <p>Restrictions contain sensitive health data and are always scoped to the authenticated user.
 */
@RestController
@RequestMapping("/api/v1/restrictions")
@Tag(name = "Restrictions", description = "Restrições por lesão e exercícios a evitar")
public class RestrictionsController {

    private final RestrictionService restrictionService;

    public RestrictionsController(RestrictionService restrictionService) {
        this.restrictionService = restrictionService;
    }

    @GetMapping
    @Operation(summary = "Consulta as restrições do usuário",
            description = "Retorna as restrições cadastradas pelo usuário autenticado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de restrições"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content)
    })
    public List<InjuryRestrictionResponse> get() {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return restrictionService.list(userId);
    }

    @PutMapping
    @Operation(summary = "Atualiza as restrições do usuário",
            description = "Substitui o conjunto de restrições do usuário autenticado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Restrições atualizadas"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "422", description = "Dados inválidos", content = @Content)
    })
    public List<InjuryRestrictionResponse> put(@Valid @RequestBody UpdateRestrictionsRequest request) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return restrictionService.update(userId, request);
    }
}
