package com.ironmind.common.web;

import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public health endpoint of the API.
 *
 * <p>It answers {@code 200 OK} as soon as the application context is up, without touching the
 * database, so it can be used by the mobile client and by the deployment platform as a liveness
 * probe. The database oriented probe is exposed by Spring Boot Actuator at {@code /actuator/health}.
 */
@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    /**
     * Current status of the API.
     *
     * @param status    always {@code UP} when the endpoint is reachable
     * @param service   identifier of the service
     * @param timestamp moment of the response
     */
    public record HealthResponse(String status, String service, Instant timestamp) {
    }

    @GetMapping
    public HealthResponse health() {
        return new HealthResponse("UP", "ironmind-backend", Instant.now());
    }
}
