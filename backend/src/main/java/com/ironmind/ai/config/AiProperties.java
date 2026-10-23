package com.ironmind.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings of the AI features that are not provider specific (SPEC.md section 12).
 *
 * <p>The limits are domain rules, not prompt instructions: whatever the model answers, the
 * backend clamps or discards the values outside of these bounds before the answer reaches the
 * user (SPEC.md section 12.2, step 6).
 *
 * @param limits    bounds applied to every structured answer
 * @param rateLimit budget of calls per user
 */
@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(Limits limits, RateLimit rateLimit) {

    public AiProperties {
        limits = limits == null ? new Limits(0, 0, 0, 0, 0, 0, 0, 0, 0) : limits;
        rateLimit = rateLimit == null ? new RateLimit(0, 0) : rateLimit;
    }

    /**
     * Bounds of a workout proposal.
     *
     * @param maxDays              biggest number of days accepted in a proposal
     * @param maxExercisesPerDay   biggest number of exercises accepted in a day
     * @param maxSets              biggest number of sets accepted per exercise
     * @param maxReps              biggest number of repetitions accepted in a range
     * @param maxRestSeconds       biggest rest accepted between sets
     * @param maxCatalogExercises  biggest number of catalog entries sent to the model
     * @param defaultRepsMin       bottom of the rep range used when the model omits it
     * @param defaultRepsMax       top of the rep range used when the model omits it
     * @param defaultRestSeconds   rest used when the model omits it
     */
    public record Limits(
            int maxDays,
            int maxExercisesPerDay,
            int maxSets,
            int maxReps,
            int maxRestSeconds,
            int maxCatalogExercises,
            int defaultRepsMin,
            int defaultRepsMax,
            int defaultRestSeconds) {

        private static final int FALLBACK_MAX_DAYS = 7;
        private static final int FALLBACK_MAX_EXERCISES_PER_DAY = 10;
        private static final int FALLBACK_MAX_SETS = 8;
        private static final int FALLBACK_MAX_REPS = 30;
        private static final int FALLBACK_MAX_REST_SECONDS = 600;
        private static final int FALLBACK_MAX_CATALOG_EXERCISES = 80;
        private static final int FALLBACK_DEFAULT_REPS_MIN = 8;
        private static final int FALLBACK_DEFAULT_REPS_MAX = 12;
        private static final int FALLBACK_DEFAULT_REST_SECONDS = 90;

        /**
         * Smallest number of sets accepted per exercise.
         */
        public static final int MIN_SETS = 1;

        /**
         * Smallest number of repetitions accepted in a range.
         */
        public static final int MIN_REPS = 1;

        /**
         * Smallest rest accepted between sets.
         */
        public static final int MIN_REST_SECONDS = 0;

        public Limits {
            maxDays = maxDays <= 0 ? FALLBACK_MAX_DAYS : Math.min(maxDays, 14);
            maxExercisesPerDay = maxExercisesPerDay <= 0
                    ? FALLBACK_MAX_EXERCISES_PER_DAY
                    : Math.min(maxExercisesPerDay, 20);
            maxSets = maxSets <= 0 ? FALLBACK_MAX_SETS : Math.min(maxSets, 20);
            maxReps = maxReps <= 0 ? FALLBACK_MAX_REPS : Math.min(maxReps, 100);
            maxRestSeconds = maxRestSeconds <= 0
                    ? FALLBACK_MAX_REST_SECONDS
                    : Math.min(maxRestSeconds, 1_800);
            maxCatalogExercises = maxCatalogExercises <= 0
                    ? FALLBACK_MAX_CATALOG_EXERCISES
                    : Math.min(maxCatalogExercises, 200);
            defaultRepsMin = defaultRepsMin <= 0 ? FALLBACK_DEFAULT_REPS_MIN : defaultRepsMin;
            defaultRepsMax = defaultRepsMax < defaultRepsMin
                    ? Math.min(FALLBACK_DEFAULT_REPS_MAX, maxReps)
                    : Math.min(defaultRepsMax, maxReps);
            defaultRestSeconds = defaultRestSeconds < 0
                    ? FALLBACK_DEFAULT_REST_SECONDS
                    : Math.min(defaultRestSeconds, maxRestSeconds);
        }
    }

    /**
     * Budget of AI calls per user.
     *
     * <p>The daily ceiling of the provider is configured in {@code app.llm}; this window protects
     * the endpoint against a burst of calls from a single account.
     *
     * @param maxRequests   maximum number of calls inside the window
     * @param windowSeconds length of the window, in seconds
     */
    public record RateLimit(int maxRequests, int windowSeconds) {

        private static final int FALLBACK_MAX_REQUESTS = 10;
        private static final int FALLBACK_WINDOW_SECONDS = 60;

        public RateLimit {
            maxRequests = maxRequests <= 0 ? FALLBACK_MAX_REQUESTS : maxRequests;
            windowSeconds = windowSeconds <= 0 ? FALLBACK_WINDOW_SECONDS : windowSeconds;
        }
    }
}
