package com.ironmind.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings of the external AI provider.
 *
 * <p>The API key is only read by the backend: it never reaches the mobile application and it is
 * never committed to the repository.
 *
 * <p>The {@code mock} provider answers deterministically and needs no credentials, so the
 * development environment and the automated tests run without spending credits. The
 * {@code openai} provider is selected explicitly by configuration and fails fast when the
 * credentials are missing.
 *
 * @param provider                       name of the provider, {@code mock} or {@code openai}
 * @param apiKey                         credential of the provider, empty when the feature is disabled
 * @param model                          identifier of the model to be used
 * @param baseUrl                        base URL of the provider
 * @param timeoutMs                      timeout of a single call, in milliseconds
 * @param maxOutputTokens                maximum size of the generated content, in tokens
 * @param dailyQuotaPerUser              maximum number of calls per user per day
 * @param maxRetries                     extra attempts after a transient failure
 * @param circuitBreakerFailureThreshold consecutive failures that open the circuit
 * @param circuitBreakerOpenSeconds      time the circuit stays open, in seconds
 */
@ConfigurationProperties(prefix = "app.llm")
public record LlmProperties(
        String provider,
        String apiKey,
        String model,
        String baseUrl,
        long timeoutMs,
        int maxOutputTokens,
        int dailyQuotaPerUser,
        int maxRetries,
        int circuitBreakerFailureThreshold,
        int circuitBreakerOpenSeconds) {

    /**
     * Provider used when the configuration omits it.
     */
    public static final String MOCK_PROVIDER = "mock";

    /**
     * Provider that calls the OpenAI compatible API.
     */
    public static final String OPENAI_PROVIDER = "openai";

    public LlmProperties {
        if (provider == null || provider.isBlank()) {
            provider = MOCK_PROVIDER;
        }
        provider = provider.strip().toLowerCase();
        if (apiKey == null) {
            apiKey = "";
        }
        if (model == null) {
            model = "";
        }
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://api.openai.com/v1";
        }
        if (timeoutMs <= 0) {
            timeoutMs = 15_000;
        }
        if (maxOutputTokens <= 0) {
            maxOutputTokens = 2_000;
        }
        if (dailyQuotaPerUser <= 0) {
            dailyQuotaPerUser = 50;
        }
        if (maxRetries < 0) {
            maxRetries = 1;
        }
        if (circuitBreakerFailureThreshold <= 0) {
            circuitBreakerFailureThreshold = 5;
        }
        if (circuitBreakerOpenSeconds <= 0) {
            circuitBreakerOpenSeconds = 30;
        }
    }

    /**
     * Tells whether the AI integration is configured.
     */
    public boolean isConfigured() {
        return !apiKey.isBlank() && !model.isBlank();
    }

    /**
     * Tells whether the mock provider is selected.
     */
    public boolean usesMockProvider() {
        return MOCK_PROVIDER.equals(provider);
    }
}
