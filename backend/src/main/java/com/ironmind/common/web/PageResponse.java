package com.ironmind.common.web;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

/**
 * Pagination envelope defined in SPEC.md appendix A.2.
 *
 * @param content       items of the current page
 * @param page          zero based page index
 * @param size          page size
 * @param totalElements total number of items
 * @param totalPages    total number of pages
 * @param hasNext       whether a next page exists
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext) {

    /**
     * Maximum page size accepted by the API.
     */
    public static final int MAX_PAGE_SIZE = 100;

    /**
     * Maps a Spring Data page into the API envelope.
     */
    public static <T> PageResponse<T> of(Page<T> page) {
        return of(page, Function.identity());
    }

    /**
     * Maps a Spring Data page into the API envelope applying the given mapper.
     */
    public static <T, R> PageResponse<R> of(Page<T> page, Function<T, R> mapper) {
        List<R> content = page.getContent().stream().map(mapper).toList();
        return new PageResponse<>(
                content,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext());
    }
}
