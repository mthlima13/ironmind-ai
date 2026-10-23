package com.ironmind.analytics;

import com.ironmind.analytics.dto.DashboardOverviewResponse;
import com.ironmind.analytics.dto.ExerciseProgressResponse;
import com.ironmind.analytics.service.AnalyticsService;
import com.ironmind.common.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints of analytics and evolution (SPEC.md section 11.5).
 *
 * <p>All calculations are performed by the backend. The dashboard uses the current week in the
 * timezone of the user, Monday to Sunday.
 */
@RestController
@RequestMapping("/api/v1/analytics")
@Tag(name = "Analytics", description = "Estatísticas, volume, 1RM e evolução por exercício")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/overview")
    @Operation(summary = "Resumo do período",
            description = "Resumo da semana atual do usuário autenticado, com comparação com a semana "
                    + "anterior, atividade por dia, sessões recentes e volume calculado pelo servidor.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Resumo da semana"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content)
    })
    public DashboardOverviewResponse overview() {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return analyticsService.overview(userId);
    }

    @GetMapping("/exercises/{id}")
    @Operation(summary = "Evolução por exercício",
            description = "Pontos por dia com melhor carga, melhor 1RM estimado (Brzycki, 1-10 repetições) "
                    + "e volume do dia, calculados pelo servidor.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Evolução do exercício"),
            @ApiResponse(responseCode = "401", description = "Token ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Exercício inexistente ou de outro usuário", content = @Content)
    })
    public ExerciseProgressResponse exerciseProgress(@PathVariable UUID id) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return analyticsService.exerciseProgress(userId, id);
    }
}
