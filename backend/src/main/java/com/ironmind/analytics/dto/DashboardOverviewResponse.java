package com.ironmind.analytics.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Overview of the current week of the user (SPEC.md section 11.5).
 *
 * <p>The period is the current week in the timezone of the user, from Monday to Sunday. The
 * comparison is made against the previous week.
 *
 * @param summary             summary of the period
 * @param volumeChangePercent percentage change of the volume against the previous week, one
 *                            decimal place; zero when the previous week has no volume
 * @param activity            days with completed sessions, in chronological order
 * @param lastSessionAt       moment the last completed session ended, {@code null} when the user
 *                            never completed one
 * @param recentSessions      sessions of the period, newest first
 */
public record DashboardOverviewResponse(
        WeeklySummaryResponse summary,
        BigDecimal volumeChangePercent,
        List<ActivityPointResponse> activity,
        Instant lastSessionAt,
        List<RecentSessionResponse> recentSessions) {
}
