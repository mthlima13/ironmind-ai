package com.ironmind.ai.service;

import com.ironmind.ai.dto.CoachRequest;
import com.ironmind.ai.dto.CoachResponse;
import com.ironmind.ai.provider.AiContext;
import com.ironmind.ai.provider.LlmGateway;
import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import com.ironmind.workout.repository.WorkoutSessionRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Contextualized coaching chat (SPEC.md section 11.6 and 12.4).
 *
 * <p>The model receives a short summary of the history, never the sessions themselves, and the
 * answer always passes the safety guard before being returned. The conversation is not stored.
 */
@Service
public class CoachService {

    private static final int HISTORY_WINDOW_DAYS = 28;

    private final AiContextBuilder contextBuilder;
    private final LlmGateway gateway;
    private final CoachSafetyGuard safetyGuard;
    private final WorkoutSessionRepository sessionRepository;
    private final Clock clock;

    public CoachService(AiContextBuilder contextBuilder,
            LlmGateway gateway,
            CoachSafetyGuard safetyGuard,
            WorkoutSessionRepository sessionRepository,
            Clock clock) {
        this.contextBuilder = contextBuilder;
        this.gateway = gateway;
        this.safetyGuard = safetyGuard;
        this.sessionRepository = sessionRepository;
        this.clock = clock;
    }

    /**
     * Answers a coaching message.
     *
     * @param userId  owner of the context, taken from the identity header
     * @param request message written by the user
     * @return safe answer with the visible notices
     */
    public CoachResponse coach(UUID userId, CoachRequest request) {
        AiContext context = contextBuilder.build(userId, null, null);

        Instant from = clock.instant().minus(Duration.ofDays(HISTORY_WINDOW_DAYS));
        long completedSessions = sessionRepository.countByUserIdAndStatusAndCompletedAtAfter(
                userId, SessionStatus.COMPLETED, from);
        Optional<WorkoutSession> lastSession =
                sessionRepository.findFirstByUserIdAndStatusAndCompletedAtIsNotNullOrderByCompletedAtDesc(
                        userId, SessionStatus.COMPLETED);
        String historySummary = contextBuilder.historySummary(
                completedSessions,
                lastSession.map(WorkoutSession::getCompletedAt).orElse(null));

        String reply = gateway.coach(context, historySummary, request.message().strip());
        CoachSafetyGuard.Result reviewed = safetyGuard.review(request.message(), reply);
        return new CoachResponse(reviewed.reply(), gateway.modelName(), reviewed.disclaimers());
    }
}
