package com.ironmind.integration;

import org.junit.jupiter.api.Assumptions;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Resolves the PostgreSQL instance used by the integration tests.
 *
 * <p>Resolution order:
 *
 * <ol>
 *   <li>the {@code IT_JDBC_URL} environment variable — an already running
 *       PostgreSQL, such as the {@code docker compose} stack of this repository;
 *   <li>a Testcontainers instance started on demand.
 * </ol>
 *
 * <p>The external mode exists because Docker Desktop on Windows exposes the
 * engine through a named pipe that docker-java cannot negotiate with recent
 * engine API versions: the CLI works, but every container call comes back as
 * HTTP 400. In CI, where the Docker API works normally, the Testcontainers path
 * is used and nothing has to be configured.
 *
 * <p>Environment variables:
 *
 * <ul>
 *   <li>{@code IT_JDBC_URL} — JDBC URL of the PostgreSQL to use;
 *   <li>{@code IT_JDBC_USER} — user, default {@code ironmind};
 *   <li>{@code IT_JDBC_PASSWORD} — password, default {@code changeme}.
 * </ul>
 */
final class TestDatabase {

    private static final DockerImageName POSTGRES_IMAGE = DockerImageName.parse("postgres:16-alpine");

    private static PostgreSQLContainer<?> container;
    private static String url;
    private static String username;
    private static String password;

    private TestDatabase() {
    }

    /**
     * Prepares the database used by the integration tests.
     *
     * <p>Aborts the test class when no PostgreSQL can be reached, so the unit
     * tests keep running on a machine without Docker.
     */
    static void start() {
        String externalUrl = readEnv("IT_JDBC_URL");
        if (externalUrl != null && !externalUrl.isBlank()) {
            url = externalUrl.trim();
            username = orDefault(readEnv("IT_JDBC_USER"), "ironmind");
            password = orDefault(readEnv("IT_JDBC_PASSWORD"), "changeme");
            return;
        }

        if (!DockerClientFactory.instance().isDockerAvailable()) {
            Assumptions.assumeTrue(false,
                    "No PostgreSQL available for the integration tests. Docker is not reachable and "
                            + "IT_JDBC_URL is not set.");
        }

        try {
            container = new PostgreSQLContainer<>(POSTGRES_IMAGE)
                    .withDatabaseName("ironmind")
                    .withUsername("ironmind")
                    .withPassword("ironmind");
            container.start();
            url = container.getJdbcUrl();
            username = container.getUsername();
            password = container.getPassword();
        } catch (RuntimeException exception) {
            throw new IllegalStateException(
                    "Docker is reachable but the PostgreSQL container could not be started.", exception);
        }
    }

    static void stop() {
        if (container != null) {
            container.stop();
            container = null;
        }
    }

    static String url() {
        return url;
    }

    static String username() {
        return username;
    }

    static String password() {
        return password;
    }

    private static String readEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            value = System.getProperty(name.toLowerCase().replace('_', '.'));
        }
        return value;
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
