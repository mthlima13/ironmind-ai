package com.ironmind.exercise.dto;

import java.util.List;

/**
 * Filters accepted by the exercise listing.
 *
 * @param page         zero based page index
 * @param size         page size, up to 100
 * @param sort         sort expression, such as {@code name,asc}
 * @param muscleGroup  main muscle group filter
 * @param equipment    equipment filter
 * @param search       free text filter applied to the name of the exercise
 * @param onlyMine     when {@code true}, only the personal exercises of the user are returned
 */
public record ExerciseQuery(
        int page,
        int size,
        String sort,
        String muscleGroup,
        String equipment,
        String search,
        boolean onlyMine) {

    /**
     * Fields accepted by the {@code sort} parameter.
     */
    public static final List<String> SORTABLE_FIELDS = List.of("name", "primaryMuscleGroup", "equipment",
            "movementType", "createdAt");

    public ExerciseQuery {
        if (page < 0) {
            page = 0;
        }
        if (size <= 0) {
            size = 20;
        }
        if (size > com.ironmind.common.web.PageResponse.MAX_PAGE_SIZE) {
            size = com.ironmind.common.web.PageResponse.MAX_PAGE_SIZE;
        }
    }
}
