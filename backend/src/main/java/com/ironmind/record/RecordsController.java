package com.ironmind.record;

import com.ironmind.common.security.SecurityUtils;
import com.ironmind.common.web.PageResponse;
import com.ironmind.record.dto.PersonalRecordResponse;
import com.ironmind.record.service.PersonalRecordService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints of the personal records (SPEC.md section 11.5).
 *
 * <p>The records are read only through the API: they are recalculated by the backend whenever a
 * set changes, never written by the client (SPEC.md section 7.4).
 */
@RestController
@RequestMapping("/api/v1/records")
@Tag(name = "Records", description = "Recordes pessoais calculados pelo servidor")
@Validated
public class RecordsController {

    private final PersonalRecordService personalRecordService;

    public RecordsController(PersonalRecordService personalRecordService) {
        this.personalRecordService = personalRecordService;
    }

    @GetMapping
    @Operation(summary = "Lista os recordes pessoais",
            description = "Retorna os recordes do usuário autenticado, do mais recente para o mais antigo. "
                    + "Cada recorde traz o nome do exercício e a unidade canônica do tipo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Página de recordes"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "422", description = "Parâmetros de paginação inválidos", content = @Content)
    })
    public PageResponse<PersonalRecordResponse> list(
            @RequestParam(defaultValue = "0") @Parameter(description = "Índice da página, começando em zero.")
            @Min(value = 0, message = "O índice da página deve ser maior ou igual a zero.")
            int page,
            @RequestParam(defaultValue = "20") @Parameter(description = "Tamanho da página, no máximo 100.")
            @Min(value = 1, message = "O tamanho da página deve ser no mínimo 1.")
            @Max(value = PageResponse.MAX_PAGE_SIZE, message = "O tamanho da página deve ser no máximo 100.")
            int size) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return personalRecordService.list(userId, page, size);
    }
}
