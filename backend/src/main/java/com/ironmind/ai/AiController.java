package com.ironmind.ai;

import com.ironmind.ai.dto.CoachRequest;
import com.ironmind.ai.dto.CoachResponse;
import com.ironmind.ai.dto.LoadSuggestionRequest;
import com.ironmind.ai.dto.LoadSuggestionResponse;
import com.ironmind.ai.dto.RecommendationDecisionRequest;
import com.ironmind.ai.dto.RecommendationDecisionResponse;
import com.ironmind.ai.dto.VoiceInterpretationRequest;
import com.ironmind.ai.dto.VoiceInterpretationResponse;
import com.ironmind.ai.dto.WorkoutProposalRequest;
import com.ironmind.ai.dto.WorkoutProposalResponse;
import com.ironmind.ai.service.AiRateLimiter;
import com.ironmind.ai.service.AiRecommendationService;
import com.ironmind.ai.service.CoachService;
import com.ironmind.ai.service.LoadSuggestionService;
import com.ironmind.ai.service.VoiceInterpretationService;
import com.ironmind.ai.service.WorkoutProposalService;
import com.ironmind.common.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints of the AI assistant (SPEC.md section 11.6).
 *
 * <p>The model is only reachable through the backend: the key never leaves the server and the
 * mobile application never talks to the provider. Every answer is validated by the backend before
 * it reaches the user, and no answer is ever written to the database by the model.
 *
 * <p>Every call that reaches the model passes the per user rate limiter first, so a rejected
 * request never spends a token.
 */
@RestController
@RequestMapping("/api/v1/ai")
@Tag(name = "IA", description = "Proposta de treino, sugestão de carga, coaching e interpretação de voz")
public class AiController {

    private final WorkoutProposalService workoutProposalService;
    private final LoadSuggestionService loadSuggestionService;
    private final CoachService coachService;
    private final VoiceInterpretationService voiceInterpretationService;
    private final AiRecommendationService recommendationService;
    private final AiRateLimiter rateLimiter;

    public AiController(WorkoutProposalService workoutProposalService,
            LoadSuggestionService loadSuggestionService,
            CoachService coachService,
            VoiceInterpretationService voiceInterpretationService,
            AiRecommendationService recommendationService,
            AiRateLimiter rateLimiter) {
        this.workoutProposalService = workoutProposalService;
        this.loadSuggestionService = loadSuggestionService;
        this.coachService = coachService;
        this.voiceInterpretationService = voiceInterpretationService;
        this.recommendationService = recommendationService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/workout-proposals")
    @Operation(summary = "Gera uma proposta de treino",
            description = "Monta um programa a partir do objetivo, das preferências, do equipamento e das "
                    + "restrições ativas do titular da requisição. A resposta é validada pelo servidor: "
                    + "exercícios fora do catálogo visível e valores fora dos limites são descartados ou "
                    + "ajustados, com aviso. Nada é salvo como programa até a revisão do usuário. "
                    + "Aceita o header Idempotency-Key.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Proposta gerada ou devolvida por uma "
                    + "requisição anterior com a mesma chave"),
            @ApiResponse(responseCode = "401", description = "Header de identidade ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "409", description = "Chave de idempotência reutilizada com outro conteúdo",
                    content = @Content),
            @ApiResponse(responseCode = "422", description = "Pedido inválido ou sem exercício compatível",
                    content = @Content),
            @ApiResponse(responseCode = "429", description = "Limite de chamadas de IA excedido", content = @Content),
            @ApiResponse(responseCode = "502", description = "Resposta da IA fora do formato esperado",
                    content = @Content),
            @ApiResponse(responseCode = "503", description = "Serviço de IA indisponível", content = @Content)
    })
    public WorkoutProposalResponse proposeWorkout(
            @Valid @RequestBody WorkoutProposalRequest request,
            @Parameter(in = ParameterIn.HEADER, name = "Idempotency-Key",
                    description = "Chave de idempotência da operação.")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        rateLimiter.check(userId);
        return workoutProposalService.propose(userId, request, idempotencyKey);
    }

    @PostMapping("/load-suggestions")
    @Operation(summary = "Sugere carga e repetições",
            description = "Sugestão conservadora calculada por regras a partir do histórico concluído do "
                    + "exercício. A carga só aumenta quando o topo da faixa foi completado nas duas últimas "
                    + "sessões, com esforço percebido de até 8 e pelo menos três sessões de histórico. "
                    + "A sugestão nunca é aplicada automaticamente. Aceita o header Idempotency-Key.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sugestão gerada ou devolvida por uma "
                    + "requisição anterior com a mesma chave"),
            @ApiResponse(responseCode = "401", description = "Header de identidade ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Exercício inexistente ou de outro usuário",
                    content = @Content),
            @ApiResponse(responseCode = "409", description = "Chave de idempotência reutilizada com outro conteúdo",
                    content = @Content),
            @ApiResponse(responseCode = "422", description = "Faixa de repetições inválida ou exercício "
                    + "bloqueado por restrição", content = @Content),
            @ApiResponse(responseCode = "429", description = "Limite de chamadas de IA excedido", content = @Content)
    })
    public LoadSuggestionResponse suggestLoad(
            @Valid @RequestBody LoadSuggestionRequest request,
            @Parameter(in = ParameterIn.HEADER, name = "Idempotency-Key",
                    description = "Chave de idempotência da operação.")
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        rateLimiter.check(userId);
        return loadSuggestionService.suggest(userId, request, idempotencyKey);
    }

    @PostMapping("/coach")
    @Operation(summary = "Conversa de coaching",
            description = "Responde uma mensagem com base em um resumo curto do histórico recente. A resposta "
                    + "passa por uma verificação de segurança: o modelo não diagnostica, não prescreve "
                    + "tratamento e não recomenda substâncias. A conversa não é armazenada.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Resposta do coaching"),
            @ApiResponse(responseCode = "401", description = "Header de identidade ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "422", description = "Mensagem inválida", content = @Content),
            @ApiResponse(responseCode = "429", description = "Limite de chamadas de IA excedido", content = @Content),
            @ApiResponse(responseCode = "502", description = "Resposta da IA fora do formato esperado",
                    content = @Content),
            @ApiResponse(responseCode = "503", description = "Serviço de IA indisponível", content = @Content)
    })
    public CoachResponse coach(@Valid @RequestBody CoachRequest request) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        rateLimiter.check(userId);
        return coachService.coach(userId, request);
    }

    @PostMapping("/voice-interpretation")
    @Operation(summary = "Interpreta uma transcrição de voz",
            description = "Converte a transcrição em séries para preencher o formulário. O áudio é "
                    + "transcrito no dispositivo: o backend recebe texto. Nada é registrado nem armazenado.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Transcrição interpretada"),
            @ApiResponse(responseCode = "401", description = "Header de identidade ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "422", description = "Transcrição inválida", content = @Content),
            @ApiResponse(responseCode = "429", description = "Limite de chamadas de IA excedido", content = @Content),
            @ApiResponse(responseCode = "502", description = "Transcrição não interpretável ou resposta fora "
                    + "do formato esperado", content = @Content),
            @ApiResponse(responseCode = "503", description = "Serviço de IA indisponível", content = @Content)
    })
    public VoiceInterpretationResponse interpretVoice(@Valid @RequestBody VoiceInterpretationRequest request) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        rateLimiter.check(userId);
        return voiceInterpretationService.interpret(request);
    }

    @PostMapping("/recommendations/{id}/decision")
    @Operation(summary = "Registra a decisão sobre uma recomendação",
            description = "Marca a recomendação como aceita, editada ou rejeitada pelo titular da requisição. "
                    + "Uma recomendação já revisada responde 409. O programa salvo a partir da proposta pode "
                    + "ser vinculado pelo campo programId, que precisa pertencer ao mesmo usuário.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Decisão registrada"),
            @ApiResponse(responseCode = "401", description = "Header de identidade ausente ou inválido", content = @Content),
            @ApiResponse(responseCode = "404", description = "Recomendação ou programa inexistente ou de outro "
                    + "usuário", content = @Content),
            @ApiResponse(responseCode = "409", description = "Recomendação já revisada", content = @Content),
            @ApiResponse(responseCode = "422", description = "Decisão ou vínculo inválido", content = @Content)
    })
    public RecommendationDecisionResponse decide(
            @PathVariable UUID id,
            @Valid @RequestBody RecommendationDecisionRequest request) {
        UUID userId = SecurityUtils.requireCurrentUserId();
        return recommendationService.decide(userId, id, request);
    }
}
