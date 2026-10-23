package com.ironmind.analytics.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Completed session of the period shown on the dashboard.
 *
 * @param id          identifier of the session
 * @param startedAt   moment the session started
 * @param completedAt moment the session was completed
 * @param programName name of the program at the moment of the request, {@code null} for a free
 *                    session or for a program that no longer exists
 * @param volumeKg    volume of the session, in kg
 * @param totalSets   number of sets of the session
 */
public record RecentSessionResponse(
        UUID id,
        Instant startedAt,
        Instant completedAt,
        String programName,
        BigDecimal volumeKg,
        int totalSets) {
}
