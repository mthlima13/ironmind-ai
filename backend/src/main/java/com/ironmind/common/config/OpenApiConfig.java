package com.ironmind.common.config;

import com.ironmind.common.security.IdentityProperties;
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

    private static final String USER_HEADER_SCHEME = "userUuidHeader";

    private final IdentityProperties identityProperties;

    public OpenApiConfig(IdentityProperties identityProperties) {
        this.identityProperties = identityProperties;
    }

    @Bean
    public OpenAPI ironMindOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("IronMind AI API")
                        .version("v1")
                        .description("""
                                REST API of the IronMind AI mobile application.

                                The API is versioned under /api/v1. The service does not authenticate
                                the caller: the gateway validates the session and forwards the owner
                                identifier in the header below. Errors follow the single format
                                described in the specification (appendix A).
                                """)
                        .license(new License().name("Proprietary")))
                .components(new Components().addSecuritySchemes(USER_HEADER_SCHEME,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name(identityProperties.userUuidHeader())))
                .addSecurityItem(new SecurityRequirement().addList(USER_HEADER_SCHEME));
    }
}
