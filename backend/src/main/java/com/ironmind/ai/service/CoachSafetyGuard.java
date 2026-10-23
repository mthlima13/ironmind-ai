package com.ironmind.ai.service;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Safety guard of the coaching chat (SPEC.md section 12.4).
 *
 * <p>The model must not diagnose, prescribe treatment or recommend substances. The prompt already
 * says so, but the answer is checked again in the backend: an answer with a forbidden term is
 * replaced by a safe message and a complaint about pain always adds the guidance to stop the
 * movement and look for a qualified professional.
 */
@Component
public class CoachSafetyGuard {

    /**
     * Visible notice that accompanies every answer.
     */
    public static final String GENERAL_DISCLAIMER =
            "Resposta informativa gerada por IA; não substitui a avaliação de um profissional de "
                    + "saúde ou de educação física.";

    /**
     * Visible notice added when the user reports pain or a limitation.
     */
    public static final String PAIN_DISCLAIMER =
            "Se você sente dor, interrompa o movimento que a provoca e procure um profissional "
                    + "qualificado.";

    private static final String SAFE_FALLBACK =
            "Não posso responder a isso com segurança. Mantenha um treino progressivo, sem dor, e "
                    + "procure um profissional qualificado para orientações individuais.";

    private static final String PAIN_NOTICE =
            "Se algum movimento provocar dor, interrompa-o e procure um profissional qualificado.";

    private static final Pattern PAIN = Pattern.compile(
            "\\b(dor|dores|doendo|doeu|lesao|lesoes|lesionad[oa]s?|machucad[oa]s?|cirurgia|cirurgias|"
                    + "inflamad[oa]s?)\\b");

    private static final Pattern FORBIDDEN = Pattern.compile(
            "\\b(diagnostico|diagnosticar|prescrevo|prescrever|prescricao|anabolizantes?|esteroides?|"
                    + "dianabol|suplementos?|suplementacao|remedios?|medicamentos?)\\b");

    /**
     * Reviews the answer of the model before it reaches the user.
     *
     * @param message message written by the user
     * @param reply   answer of the model
     * @return safe answer and the notices that must be shown with it
     */
    public Result review(String message, String reply) {
        String safeReply = reply == null || reply.isBlank() ? SAFE_FALLBACK : reply.strip();
        List<String> disclaimers = new ArrayList<>();
        disclaimers.add(GENERAL_DISCLAIMER);

        String normalizedReply = normalize(safeReply);
        if (FORBIDDEN.matcher(normalizedReply).find()) {
            safeReply = SAFE_FALLBACK;
            normalizedReply = normalize(safeReply);
        }

        boolean painReported = PAIN.matcher(normalize(message)).find()
                || PAIN.matcher(normalizedReply).find();
        if (painReported) {
            disclaimers.add(PAIN_DISCLAIMER);
            if (!normalizedReply.contains("interromp")) {
                safeReply = safeReply + " " + PAIN_NOTICE;
            }
        }
        return new Result(safeReply, List.copyOf(disclaimers));
    }

    private static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String decomposed = Normalizer.normalize(value, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
    }

    /**
     * Answer after the safety review.
     *
     * @param reply       answer that can be shown to the user
     * @param disclaimers notices that must be shown with the answer
     */
    public record Result(String reply, List<String> disclaimers) {
    }
}
