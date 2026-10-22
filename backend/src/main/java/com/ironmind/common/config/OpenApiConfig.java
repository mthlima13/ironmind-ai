package com.ironmind.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI metadata of the IronMind AI API.
 *
 * <p>The generated contract is served at {@code /v3/api-docs} and the interactive documentation
 * at {@code /swagger-ui.html}.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI ironMindOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("IronMind AI API")
                        .version("v1")
                        .description("""
                                REST API of the IronMind AI mobile application.

                                The API is versioned under /api/v1. Every private endpoint expects the
                                header `Authorization: Bearer <accessToken>` and answers errors in the
                                single format described in the specification (appendix A).
                                """)
                        .license(new License().name("Proprietary")))
                .components(new Components().addSecuritySchemes(BEARER_SCHEME,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
