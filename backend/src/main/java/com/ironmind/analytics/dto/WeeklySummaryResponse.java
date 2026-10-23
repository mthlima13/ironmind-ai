package com.ironmind.analytics.dto;

import java.math.BigDecimal;

/**
 * Summary of the period shown on the dashboard (SPEC.md section 11.5).
 *
 * @param totalVolumeKg         volume of the completed sessions of the period, in kg
 * @param completedSessions     number of sessions completed in the period
 * @param recordsBroken         number of personal records achieved in the period
 * @param totalSets             number of sets registered in the completed sessions of the period
 * @param averageSessionMinutes average duration of the completed sessions, in minutes
 */
public record WeeklySummaryResponse(
        BigDecimal totalVolumeKg,
        int completedSessions,
        long recordsBroken,
        int totalSets,
        int averageSessionMinutes) {
}
