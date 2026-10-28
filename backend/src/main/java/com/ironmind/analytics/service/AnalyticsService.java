package com.ironmind.analytics.service;

import com.ironmind.analytics.dto.ActivityPointResponse;
import com.ironmind.analytics.dto.DashboardOverviewResponse;
import com.ironmind.analytics.dto.ExerciseProgressPointResponse;
import com.ironmind.analytics.dto.ExerciseProgressResponse;
import com.ironmind.analytics.dto.RecentSessionResponse;
import com.ironmind.analytics.dto.WeeklySummaryResponse;
import com.ironmind.common.exception.ResourceNotFoundException;
import com.ironmind.exercise.dto.ExerciseResponse;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.program.entity.WorkoutProgram;
import com.ironmind.program.repository.WorkoutProgramRepository;
import com.ironmind.record.repository.PersonalRecordRepository;
import com.ironmind.workout.entity.ExerciseSet;
import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import com.ironmind.workout.repository.ExerciseSetRepository;
import com.ironmind.workout.repository.WorkoutSessionRepository;
import com.ironmind.workout.service.OneRepMaxCalculator;
import com.ironmind.workout.service.VolumeCalculator;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aggregations for the dashboard and the evolution of exercises (SPEC.md section 11.5).
 *
 * <p>Every calculation is done in the backend. The period of the dashboard is the current week
 * in UTC, from Monday to Sunday, with the previous week as the comparison point.
 *
 * <p>The service stores no timezone of the user: the account belongs to the identity provider,
 * so the analysis always runs in UTC and the client renders the local date.
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final int MAX_RECENT_SESSIONS = 20;

    /**
     * Timezone of the analysis, always UTC.
     */
    private static final ZoneId ANALYSIS_ZONE = ZoneId.of("UTC");

    private final WorkoutSessionRepository sessionRepository;
    private final ExerciseSetRepository exerciseSetRepository;
    private final PersonalRecordRepository recordRepository;
    private final ExerciseRepository exerciseRepository;
    private final WorkoutProgramRepository programRepository;
    private final VolumeCalculator volumeCalculator;
    private final OneRepMaxCalculator oneRepMaxCalculator;
    private final Clock clock;

    public AnalyticsService(WorkoutSessionRepository sessionRepository,
            ExerciseSetRepository exerciseSetRepository, PersonalRecordRepository recordRepository,
            ExerciseRepository exerciseRepository, WorkoutProgramRepository programRepository,
            VolumeCalculator volumeCalculator, OneRepMaxCalculator oneRepMaxCalculator, Clock clock) {
        this.sessionRepository = sessionRepository;
        this.exerciseSetRepository = exerciseSetRepository;
        this.recordRepository = recordRepository;
        this.exerciseRepository = exerciseRepository;
        this.programRepository = programRepository;
        this.volumeCalculator = volumeCalculator;
        this.oneRepMaxCalculator = oneRepMaxCalculator;
        this.clock = clock;
    }

    /**
     * Builds the dashboard overview for the current week of the user.
     */
    public DashboardOverviewResponse overview(UUID userId) {
        ZoneId zoneId = ANALYSIS_ZONE;
        ZonedDateTime now = ZonedDateTime.now(clock).withZoneSameInstant(zoneId);
        Period current = currentWeek(now);
        Period previous = previousWeek(current);

        List<WorkoutSession> currentSessions = sessionRepository.findCompletedBetween(
                userId, SessionStatus.COMPLETED, current.from(), current.to(),
                Sort.by(Sort.Direction.DESC, "completedAt"));
        List<WorkoutSession> previousSessions = sessionRepository.findCompletedBetween(
                userId, SessionStatus.COMPLETED, previous.from(), previous.to(),
                Sort.by(Sort.Direction.DESC, "completedAt"));

        List<ExerciseSet> currentSets = setsOf(currentSessions);
        List<ExerciseSet> previousSets = setsOf(previousSessions);

        BigDecimal currentVolume = volumeCalculator.totalVolume(volumeOf(currentSets));
        BigDecimal previousVolume = volumeCalculator.totalVolume(volumeOf(previousSets));
        int totalSets = currentSets.size();
        int completedSessions = currentSessions.size();
        long recordsBroken = recordRepository.countAchievedBetween(
                userId, current.from(), current.to());
        int averageMinutes = averageMinutes(currentSessions);
        BigDecimal volumeChangePercent = changePercent(currentVolume, previousVolume);

        List<ActivityPointResponse> activity = activity(currentSessions, currentSets, zoneId);
        WorkoutSession last = sessionRepository
                .findFirstByUserIdAndStatusAndCompletedAtIsNotNullOrderByCompletedAtDesc(userId,
                        SessionStatus.COMPLETED)
                .orElse(null);
        List<RecentSessionResponse> recent = recentSessions(currentSessions);

        return new DashboardOverviewResponse(
                new WeeklySummaryResponse(currentVolume, completedSessions, recordsBroken, totalSets,
                        averageMinutes),
                volumeChangePercent,
                activity,
                last == null ? null : last.getCompletedAt(),
                recent);
    }

    /**
     * Builds the evolution of an exercise, grouping the sets by day in UTC.
     *
     * <p>A set of another user is reported as not found. The exercise must be visible to the user
     * in the same way as the exercise catalog (SPEC.md section 3.4).
     */
    public ExerciseProgressResponse exerciseProgress(UUID userId, UUID exerciseId) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .filter(candidate -> candidate.isVisibleTo(userId))
                .orElseThrow(() -> new ResourceNotFoundException("exercício", exerciseId));
        ZoneId zoneId = ANALYSIS_ZONE;

        List<ExerciseSet> sets = exerciseSetRepository
                .findByUserIdAndExerciseIdOrderByCompletedAtAscIdAsc(userId, exerciseId);
        List<ExerciseProgressPointResponse> points = groupByDay(sets, zoneId);
        return new ExerciseProgressResponse(ExerciseResponse.from(exercise), points);
    }

    private List<ExerciseSet> setsOf(List<WorkoutSession> sessions) {
        if (sessions.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = sessions.stream().map(WorkoutSession::getId).toList();
        return exerciseSetRepository.findBySessionIdIn(ids);
    }

    private List<VolumeCalculator.SetVolume> volumeOf(List<ExerciseSet> sets) {
        List<VolumeCalculator.SetVolume> volumes = new ArrayList<>(sets.size());
        for (ExerciseSet set : sets) {
            volumes.add(new VolumeCalculator.SetVolume(set.getWeightKg(), set.getRepetitions()));
        }
        return volumes;
    }

    private int averageMinutes(List<WorkoutSession> sessions) {
        if (sessions.isEmpty()) {
            return 0;
        }
        long totalMinutes = 0;
        int counted = 0;
        for (WorkoutSession session : sessions) {
            if (session.getStartedAt() == null || session.getCompletedAt() == null) {
                continue;
            }
            long minutes = ChronoUnit.MINUTES.between(session.getStartedAt(), session.getCompletedAt());
            if (minutes >= 0) {
                totalMinutes += minutes;
                counted++;
            }
        }
        return counted == 0 ? 0 : (int) Math.round((double) totalMinutes / (double) counted);
    }

    private BigDecimal changePercent(BigDecimal current, BigDecimal previous) {
        if (previous.signum() == 0) {
            return BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
        }
        BigDecimal change = current.subtract(previous).multiply(ONE_HUNDRED)
                .divide(previous, 1, RoundingMode.HALF_UP);
        return change;
    }

    private List<ActivityPointResponse> activity(List<WorkoutSession> sessions,
            List<ExerciseSet> sets, ZoneId zoneId) {
        Map<LocalDate, DayActivity> byDay = new HashMap<>();
        for (WorkoutSession session : sessions) {
            if (session.getCompletedAt() == null) {
                continue;
            }
            LocalDate date = session.getCompletedAt().atZone(zoneId).toLocalDate();
            byDay.computeIfAbsent(date, key -> new DayActivity(0, BigDecimal.ZERO)).incrementSessions();
        }
        for (ExerciseSet set : sets) {
            if (set.getCompletedAt() == null) {
                continue;
            }
            LocalDate date = set.getCompletedAt().atZone(zoneId).toLocalDate();
            BigDecimal volume = volumeCalculator.volumeOf(set.getWeightKg(), set.getRepetitions());
            DayActivity activity = byDay.computeIfAbsent(date, key -> new DayActivity(0,
                    BigDecimal.ZERO));
            activity.addVolume(volume);
        }
        List<LocalDate> dates = new ArrayList<>(byDay.keySet());
        dates.sort(Comparator.naturalOrder());
        List<ActivityPointResponse> points = new ArrayList<>(dates.size());
        for (LocalDate date : dates) {
            DayActivity activity = byDay.get(date);
            points.add(new ActivityPointResponse(date, activity.volume.setScale(2,
                    RoundingMode.HALF_UP), activity.sessions));
        }
        return points;
    }

    private List<RecentSessionResponse> recentSessions(List<WorkoutSession> sessions) {
        List<WorkoutSession> ordered = new ArrayList<>(sessions);
        ordered.sort(Comparator.comparing(WorkoutSession::getCompletedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));
        List<RecentSessionResponse> result = new ArrayList<>();
        for (WorkoutSession session : ordered) {
            if (result.size() >= MAX_RECENT_SESSIONS) {
                break;
            }
            String programName = programName(session.getProgramId());
            List<ExerciseSet> sets = setsOf(List.of(session));
            BigDecimal volume = volumeCalculator.totalVolume(volumeOf(sets));
            int totalSets = sets.size();
            result.add(new RecentSessionResponse(session.getId(), session.getStartedAt(),
                    session.getCompletedAt(), programName, volume, totalSets));
        }
        return result;
    }

    private String programName(UUID programId) {
        if (programId == null) {
            return null;
        }
        return programRepository.findById(programId).map(WorkoutProgram::getName).orElse(null);
    }

    private List<ExerciseProgressPointResponse> groupByDay(List<ExerciseSet> sets, ZoneId zoneId) {
        Map<LocalDate, DayProgress> byDay = new HashMap<>();
        for (ExerciseSet set : sets) {
            if (set.getCompletedAt() == null) {
                continue;
            }
            LocalDate date = set.getCompletedAt().atZone(zoneId).toLocalDate();
            DayProgress progress = byDay.computeIfAbsent(date, key -> new DayProgress());
            progress.countSet();
            progress.addVolume(volumeCalculator.volumeOf(set.getWeightKg(), set.getRepetitions()));
            progress.considerWeight(set.getWeightKg());
            oneRepMaxCalculator.estimate(set.getWeightKg(), set.getRepetitions())
                    .ifPresent(progress::considerOneRepMax);
        }
        List<LocalDate> dates = new ArrayList<>(byDay.keySet());
        dates.sort(Comparator.naturalOrder());
        List<ExerciseProgressPointResponse> points = new ArrayList<>(dates.size());
        for (LocalDate date : dates) {
            DayProgress progress = byDay.get(date);
            points.add(new ExerciseProgressPointResponse(date, scaleOrNull(progress.bestWeight),
                    scaleOrNull(progress.bestOneRepMax), progress.volume.setScale(2,
                            RoundingMode.HALF_UP), progress.sets));
        }
        return points;
    }

    private static BigDecimal scaleOrNull(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private static Period currentWeek(ZonedDateTime now) {
        ZonedDateTime start = now.with(DayOfWeek.MONDAY).truncatedTo(ChronoUnit.DAYS);
        ZonedDateTime end = start.plusWeeks(1);
        return new Period(start.toInstant(), end.toInstant());
    }

    private static Period previousWeek(Period current) {
        return new Period(current.from.minus(7, ChronoUnit.DAYS), current.from);
    }

    private record Period(Instant from, Instant to) {
    }

    private static class DayActivity {
        private int sessions;
        private BigDecimal volume;

        DayActivity(int sessions, BigDecimal volume) {
            this.sessions = sessions;
            this.volume = volume;
        }

        void incrementSessions() {
            sessions++;
        }

        void addVolume(BigDecimal volume) {
            this.volume = this.volume.add(volume == null ? BigDecimal.ZERO : volume);
        }
    }

    private static class DayProgress {
        private BigDecimal bestWeight;
        private BigDecimal bestOneRepMax;
        private BigDecimal volume = BigDecimal.ZERO;
        private int sets;

        void countSet() {
            sets++;
        }

        void addVolume(BigDecimal volume) {
            this.volume = this.volume.add(volume == null ? BigDecimal.ZERO : volume);
        }

        void considerWeight(BigDecimal weight) {
            if (weight == null) {
                return;
            }
            if (bestWeight == null || weight.compareTo(bestWeight) > 0) {
                bestWeight = weight;
            }
        }

        void considerOneRepMax(BigDecimal oneRepMax) {
            if (oneRepMax == null) {
                return;
            }
            if (bestOneRepMax == null || oneRepMax.compareTo(bestOneRepMax) > 0) {
                bestOneRepMax = oneRepMax;
            }
        }
    }
}
