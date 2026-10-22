package com.ironmind.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new SampleController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("answers 422 with the standard error payload when the payload is invalid")
    void answersWithTheStandardErrorPayload() throws Exception {
        mockMvc.perform(post("/api/v1/sample")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"weight\":-1}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.error").value("Validation Failed"))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").value("/api/v1/sample"))
                .andExpect(jsonPath("$.traceId").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors").isArray())
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'name')].message").isNotEmpty())
                .andExpect(jsonPath("$.fieldErrors[?(@.field == 'weight')].message").isNotEmpty());
    }

    @Test
    @DisplayName("never exposes a stack trace in the error payload")
    void neverExposesAStackTrace() throws Exception {
        String body = mockMvc.perform(post("/api/v1/sample")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"weight\":-1}"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        org.assertj.core.api.Assertions.assertThat(body)
                .doesNotContain("org.springframework")
                .doesNotContain("java.lang")
                .doesNotContain("Exception");
    }

    @Test
    @DisplayName("answers 422 when the request body cannot be read")
    void answersWhenTheBodyCannotBeRead() throws Exception {
        mockMvc.perform(post("/api/v1/sample")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not-json"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.traceId").isNotEmpty());
    }

    @RestController
    @RequestMapping("/api/v1/sample")
    static class SampleController {

        @PostMapping
        void create(@Valid @RequestBody SampleRequest request) {
            // The controller of the test only triggers the validation.
        }
    }

    /**
     * Payload used to trigger a Bean Validation failure.
     */
    static class SampleRequest {

        @NotBlank(message = "O nome é obrigatório.")
        private String name;

        @Positive(message = "O peso deve ser positivo.")
        private Integer weight;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public Integer getWeight() {
            return weight;
        }

        public void setWeight(Integer weight) {
            this.weight = weight;
        }
    }
}
