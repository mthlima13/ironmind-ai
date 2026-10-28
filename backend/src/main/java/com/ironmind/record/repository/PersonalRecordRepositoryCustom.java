package com.ironmind.record.repository;

import java.time.Instant;
import java.util.UUID;

/**
 * Queries of the personal records that the derived method names cannot express.
 */
public interface PersonalRecordRepositoryCustom {

    /**
     * Counts the records achieved by the user inside the half-open period {@code [from, to)}.
     *
     * <p>A derived method name with two conditions on {@code achievedAt} does not work: Spring Data
     * merges both operators into a single {@code Document} and the second overwrites the first, so
     * the count goes through an explicit criteria instead.
     */
    long countAchievedBetween(UUID userId, Instant from, Instant to);
}
