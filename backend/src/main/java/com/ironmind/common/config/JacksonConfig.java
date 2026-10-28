package com.ironmind.common.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import java.io.IOException;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Serialization of the timestamps exposed by the API.
 *
 * <p>MongoDB stores a date with millisecond precision, so a value written in the same request
 * would come back with fewer digits than it was first answered with. Truncating every {@link
 * Instant} to milliseconds keeps the response of a write identical to the later reads of the same
 * resource.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer millisecondInstantCustomizer() {
        return builder -> builder.serializerByType(Instant.class, new MillisecondInstantSerializer());
    }

    /**
     * Writes an instant as ISO-8601 in UTC, with the precision the database keeps.
     */
    static final class MillisecondInstantSerializer extends JsonSerializer<Instant> {

        @Override
        public void serialize(Instant value, JsonGenerator generator, SerializerProvider serializers)
                throws IOException {
            generator.writeString(DateTimeFormatter.ISO_INSTANT.format(value.truncatedTo(ChronoUnit.MILLIS)));
        }
    }
}
