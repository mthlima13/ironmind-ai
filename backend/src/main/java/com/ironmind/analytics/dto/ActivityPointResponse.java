package com.ironmind.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Volume of a single day of the period.
 *
 * @param date              local date in the timezone of the user
 * @param volumeKg          volume of the day, in kg
 * @param completedSessions number of sessions completed on the day
 */
public record ActivityPointResponse(
        LocalDate date,
        BigDecimal volumeKg,
        int completedSessions) {
}
