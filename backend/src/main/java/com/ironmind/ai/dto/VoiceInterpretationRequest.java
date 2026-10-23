package com.ironmind.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request of the interpretation of a voice transcription (SPEC.md section 11.6).
 *
 * <p>The audio itself is transcribed on the device: the backend receives text only. The
 * transcription is not stored.
 *
 * @param transcript text spoken by the user
 */
public record VoiceInterpretationRequest(
        @NotBlank(message = "Envie a transcrição do áudio.")
        @Size(max = 2_000, message = "A transcrição deve ter no máximo 2000 caracteres.")
        String transcript) {
}
