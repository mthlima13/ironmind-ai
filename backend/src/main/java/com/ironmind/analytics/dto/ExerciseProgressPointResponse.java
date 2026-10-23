package com.ironmind.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Evolution of an exercise on a single day.
 *
 * @param date                  local date in the timezone of the user
 * @param bestWeightKg          best external load of the day, {@code null} when no set had load
 * @param estimatedOneRepMaxKg  best Brzycki estimate of the day, {@code null} when no set was in
 *                              the validity range of the formula
 * @param totalVolumeKg         volume of the day, in kg
 * @param sets                  number of sets of the day
 */
public record ExerciseProgressPointResponse(
        LocalDate date,
        BigDecimal bestWeightKg,
        BigDecimal estimatedOneRepMaxKg,
        BigDecimal totalVolumeKg,
        int sets) {
}
