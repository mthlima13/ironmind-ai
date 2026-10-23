package com.ironmind.ai.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Request of a load suggestion (SPEC.md section 12.3).
 *
 * @param exerciseId    exercise whose history is the base of the suggestion
 * @param targetRepsMin bottom of the target range, {@code null} to use the default of the server
 * @param targetRepsMax top of the target range, {@code null} to use the default of the server
 */
public record LoadSuggestionRequest(
        @NotNull(message = "Informe o exercício.")
        UUID exerciseId,

        @Min(value = 1, message = "A faixa de repetições começa em 1.")
        @Max(value = 30, message = "A faixa de repetições termina em 30.")
        Integer targetRepsMin,

        @Min(value = 1, message = "A faixa de repetições começa em 1.")
        @Max(value = 30, message = "A faixa de repetições termina em 30.")
        Integer targetRepsMax) {
}
