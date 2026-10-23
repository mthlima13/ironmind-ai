package com.ironmind.ai.dto;

import java.util.List;

/**
 * Answer of the coaching chat (SPEC.md section 12.4).
 *
 * <p>The disclaimers are always present and explain that the answer is informative, that the
 * model does not diagnose and that pain requires a qualified professional.
 *
 * @param reply       answer of the model
 * @param model       model that produced the answer
 * @param disclaimers visible safety notices
 */
public record CoachResponse(String reply, String model, List<String> disclaimers) {
}
