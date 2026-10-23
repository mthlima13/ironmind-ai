package com.ironmind.ai.service;

import com.ironmind.ai.config.AiProperties;
import com.ironmind.ai.dto.SuggestedSetResponse;
import com.ironmind.ai.dto.VoiceInterpretationRequest;
import com.ironmind.ai.dto.VoiceInterpretationResponse;
import com.ironmind.ai.provider.LlmGateway;
import com.ironmind.ai.schema.VoiceInterpretationPayload;
import com.ironmind.common.exception.AiInvalidResponseException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Interpretation of a voice transcription (SPEC.md section 11.6).
 *
 * <p>The values only pre-fill the set form: nothing is registered and nothing is persisted. The
 * transcription is not stored, because it may contain health details and there is no retention
 * policy defined yet.
 */
@Service
public class VoiceInterpretationService {

    /**
     * Visible notice that accompanies every interpretation.
     */
    public static final String DISCLAIMER =
            "Interpretação automática. Confirme carga, repetições e distância antes de registrar.";

    private static final BigDecimal MAX_WEIGHT_KG = new BigDecimal("500");
    private static final int MAX_DURATION_SECONDS = 7_200;
    private static final int MAX_DISTANCE_METERS = 100_000;

    private final LlmGateway gateway;
    private final AiProperties properties;

    public VoiceInterpretationService(LlmGateway gateway, AiProperties properties) {
        this.gateway = gateway;
        this.properties = properties;
    }

    /**
     * Interprets the transcription.
     *
     * @param request text spoken by the user
     * @return sets to pre-fill the form, never persisted
     */
    public VoiceInterpretationResponse interpret(VoiceInterpretationRequest request) {
        VoiceInterpretationPayload payload = gateway.interpretVoice(request.transcript().strip());
        AiProperties.Limits limits = properties.limits();

        List<SuggestedSetResponse> sets = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        int adjusted = 0;

        List<VoiceInterpretationPayload.Set> candidates = payload.sets() == null ? List.of() : payload.sets();
        for (VoiceInterpretationPayload.Set candidate : candidates) {
            if (candidate == null) {
                continue;
            }
            boolean hasRepetitions = candidate.repetitions() != null;
            boolean hasDuration = candidate.durationSeconds() != null;
            boolean hasDistance = candidate.distanceMeters() != null;
            if (!hasRepetitions && !hasDuration && !hasDistance) {
                adjusted++;
                continue;
            }

            int repetitions = candidate.repetitions() == null ? 0 : candidate.repetitions();
            if (repetitions < 0 || repetitions > limits.maxReps()) {
                repetitions = Math.max(0, Math.min(limits.maxReps(), repetitions));
                adjusted++;
            }

            BigDecimal weight = candidate.weightKg();
            if (weight != null && (weight.signum() < 0 || weight.compareTo(MAX_WEIGHT_KG) > 0)) {
                weight = null;
                adjusted++;
            }

            Integer duration = candidate.durationSeconds();
            if (duration != null && (duration <= 0 || duration > MAX_DURATION_SECONDS)) {
                duration = null;
                adjusted++;
            }

            Integer distance = candidate.distanceMeters();
            if (distance != null && (distance <= 0 || distance > MAX_DISTANCE_METERS)) {
                distance = null;
                adjusted++;
            }

            sets.add(new SuggestedSetResponse(sets.size() + 1, weight, repetitions, duration, distance));
        }

        if (sets.isEmpty()) {
            throw new AiInvalidResponseException(
                    "Não foi possível interpretar a transcrição. Informe a carga e as repetições de cada série.");
        }
        if (adjusted > 0) {
            warnings.add(adjusted + " valor(es) fora dos limites foram ajustados ou descartados.");
        }

        return new VoiceInterpretationResponse(
                sets,
                payload.notes(),
                gateway.modelName(),
                warnings,
                DISCLAIMER);
    }
}
