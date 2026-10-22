package com.ironmind.auth.dto;

/**
 * Generic answer of the endpoints that must not reveal anything about the informed data.
 *
 * @param message human readable message
 */
public record MessageResponse(String message) {
}
