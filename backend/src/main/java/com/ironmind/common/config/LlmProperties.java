package com.ironmind.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Settings of the external AI provider.
 *
 * <p>The API key is only read by the backend: it never reaches the mobile application and it is
 * never committed to the repository.
 *
 * @param apiKey             credential of the provider, empty when the feature is disabled
 * @param model              identifier of the model to be used
 * @param baseUrl            base URL of the provider
 * @param timeoutMs          timeout of a single call, in milliseconds
 * @param maxOutputTokens    maximum size of the generated content, in tokens
 * @param dailyQuotaPerUser  maximum number of calls per user per day
 */
@ConfigurationProperties(prefix = "app.llm")
public record LlmProperties(
        String apiKey,
        String model,
        String baseUrl,
        long timeoutMs,
        int maxOutputTokens,
        int dailyQuotaPerUser) {

    public LlmProperties {
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
    }

    /**
     * Tells whether the AI integration is configured.
     */
    public boolean isConfigured() {
        return !apiKey.isBlank() && !model.isBlank();
    }
}
