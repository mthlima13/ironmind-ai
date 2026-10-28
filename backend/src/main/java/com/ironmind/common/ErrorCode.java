package com.ironmind.common;

import org.springframework.http.HttpStatus;

/**
 * Stable error codes returned by the API.
 *
 * <p>The code is the contract used by the mobile client for i18n and must remain
 * stable; the HTTP status is derived from it.
 */
public enum ErrorCode {

    VALIDATION_ERROR(HttpStatus.UNPROCESSABLE_ENTITY, "Validation Failed"),
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Unauthorized"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "Forbidden"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "Not Found"),
    CONFLICT(HttpStatus.CONFLICT, "Conflict"),
    IDEMPOTENCY_KEY_REUSED(HttpStatus.CONFLICT, "Conflict"),
    RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests"),
    AI_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "Service Unavailable"),
    AI_INVALID_RESPONSE(HttpStatus.BAD_GATEWAY, "Bad Gateway"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error");

    private final HttpStatus status;
    private final String reasonPhrase;

    ErrorCode(HttpStatus status, String reasonPhrase) {
        this.status = status;
        this.reasonPhrase = reasonPhrase;
    }

    public HttpStatus status() {
        return status;
    }

    public int statusValue() {
        return status.value();
    }

    /**
     * Human readable reason phrase sent in the {@code error} field of the error payload.
     */
    public String reasonPhrase() {
        return reasonPhrase;
    }

    /**
     * Default (Portuguese) message used when a more specific one is not provided.
     */
    public String defaultMessage() {
        return switch (this) {
            case VALIDATION_ERROR -> "Dados inválidos.";
            case UNAUTHENTICATED -> "Identidade ausente ou inválida.";
            case FORBIDDEN -> "Acesso negado.";
            case NOT_FOUND -> "Recurso não encontrado.";
            case CONFLICT -> "Conflito de estado.";
            case IDEMPOTENCY_KEY_REUSED -> "Chave de idempotência reutilizada com conteúdo diferente.";
            case RATE_LIMITED -> "Limite de requisições excedido. Tente novamente mais tarde.";
            case AI_UNAVAILABLE -> "Serviço de IA indisponível no momento.";
            case AI_INVALID_RESPONSE -> "Resposta inválida recebida do serviço de IA.";
            case INTERNAL_ERROR -> "Erro interno. Tente novamente mais tarde.";
        };
    }
}
