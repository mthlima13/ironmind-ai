package com.ironmind.ai.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.ai.provider.LlmGateway;
import com.ironmind.ai.provider.LlmProvider;
import com.ironmind.ai.provider.MockLlmProvider;
import com.ironmind.ai.provider.OpenAiLlmProvider;
import com.ironmind.common.config.LlmProperties;
import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires the provider selected by the configuration.
 *
 * <p>The mock is the default, so the development environment and the automated tests never need
 * a credential. The real provider is only created when it is explicitly selected <em>and</em>
 * configured: a missing key is a startup error instead of a surprise at the first request.
 */
@Configuration
public class AiConfiguration {

    @Bean
    public LlmProvider llmProvider(LlmProperties properties, ObjectMapper objectMapper) {
        if (properties.usesMockProvider()) {
            return new MockLlmProvider();
        }
        if (LlmProperties.OPENAI_PROVIDER.equals(properties.provider())) {
            if (!properties.isConfigured()) {
                throw new IllegalStateException(
                        "app.llm.provider=openai requires LLM_API_KEY and LLM_MODEL to be set");
            }
            return new OpenAiLlmProvider(properties, objectMapper);
        }
        throw new IllegalStateException("Unsupported app.llm.provider: " + properties.provider());
    }

    @Bean
    public LlmGateway llmGateway(LlmProvider provider, LlmProperties properties, Clock clock) {
        return new LlmGateway(
                provider,
                properties.maxRetries(),
                properties.circuitBreakerFailureThreshold(),
                properties.circuitBreakerOpenSeconds(),
                clock);
    }
}
