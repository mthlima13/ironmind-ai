package com.ironmind.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.exercise.repository.ExerciseRepository;
import com.ironmind.record.entity.PersonalRecord;
import com.ironmind.record.entity.RecordType;
import com.ironmind.record.repository.PersonalRecordRepository;
import com.ironmind.user.entity.User;
import com.ironmind.user.entity.UserRole;
import com.ironmind.user.repository.UserRepository;
import com.ironmind.workout.entity.ExerciseSet;
import com.ironmind.workout.entity.SessionExercise;
import com.ironmind.workout.entity.SessionStatus;
import com.ironmind.workout.entity.WorkoutSession;
import com.ironmind.workout.repository.ExerciseSetRepository;
import com.ironmind.workout.repository.SessionExerciseRepository;
import com.ironmind.workout.repository.WorkoutSessionRepository;
import com.ironmind.workout.service.VolumeCalculator;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

/**
 * Integration test of the persistence model against a real PostgreSQL.
 *
 * <p>The database is provided by {@link TestDatabase}: an already running
 * PostgreSQL when {@code IT_JDBC_URL} is set, a Testcontainers instance
 * otherwise. The test is skipped when no PostgreSQL is reachable, so the unit
 * tests keep running on a machine without Docker.
 */
@SpringBootTest
class PersistenceIntegrationTest {

    @BeforeAll
    static void startDatabase() {
        TestDatabase.start();
    }

    @AfterAll
    static void stopDatabase() {
        TestDatabase.stop();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", TestDatabase::url);
        registry.add("spring.datasource.username", TestDatabase::username);
        registry.add("spring.datasource.password", TestDatabase::password);
    }

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExerciseRepository exerciseRepository;

    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;

    @Autowired
    private SessionExerciseRepository sessionExerciseRepository;

    @Autowired
    private ExerciseSetRepository exerciseSetRepository;

    @Autowired
    private PersonalRecordRepository personalRecordRepository;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private VolumeCalculator volumeCalculator;

    @Test
    @Transactional
    @DisplayName("persists the sets of a session and the personal record of the exercise")
    void persistsSetsAndPersonalRecords() {
        User user = userRepository.save(new User(UUID.randomUUID(), "Ana Souza", uniqueEmail("ana"),
                "hash", UserRole.USER, "America/Sao_Paulo"));
        Exercise exercise = exerciseRepository.save(new Exercise(UUID.randomUUID(), "Supino reto com barra",
                "Movimento composto para peitoral.", "Peito", List.of("Tríceps"), "Barra",
                "Deite no banco e desça a barra até o peito.", MovementType.COMPOUND));
        WorkoutSession session = workoutSessionRepository.save(
                new WorkoutSession(UUID.randomUUID(), user, null, null, Instant.now(), SessionStatus.COMPLETED));
        SessionExercise sessionExercise = sessionExerciseRepository.save(
                new SessionExercise(UUID.randomUUID(), session, exercise, 1));

        exerciseSetRepository.save(new ExerciseSet(UUID.randomUUID(), sessionExercise, 1, new BigDecimal("80.00"), 10));
        exerciseSetRepository.save(new ExerciseSet(UUID.randomUUID(), sessionExercise, 2, new BigDecimal("80.00"), 8));
        exerciseSetRepository.save(new ExerciseSet(UUID.randomUUID(), sessionExercise, 3, null, 12));
        personalRecordRepository.save(new PersonalRecord(UUID.randomUUID(), user, exercise, RecordType.MAX_WEIGHT,
                new BigDecimal("80.00"), "kg", null, Instant.now()));

        exerciseSetRepository.flush();
        personalRecordRepository.flush();
        entityManager.clear();

        List<ExerciseSet> sets = exerciseSetRepository.findBySessionExerciseIdOrderBySetNumber(sessionExercise.getId());
        assertThat(sets).hasSize(3);
        assertThat(sets.get(0).getWeightKg()).isEqualByComparingTo("80.00");
        assertThat(sets.get(0).getRepetitions()).isEqualTo(10);
        assertThat(sets.get(2).getWeightKg()).isNull();

        PersonalRecord record = personalRecordRepository
                .findByUserIdAndExerciseIdAndRecordType(user.getId(), exercise.getId(), RecordType.MAX_WEIGHT)
                .orElseThrow();
        assertThat(record.getValue()).isEqualByComparingTo("80.00");
        assertThat(record.getUnit()).isEqualTo("kg");

        BigDecimal volume = volumeCalculator.totalVolume(sets.stream()
                .map(set -> new VolumeCalculator.SetVolume(set.getWeightKg(), set.getRepetitions()))
                .toList());
        assertThat(volume).isEqualByComparingTo("1440.00");
    }

    @Test
    @Transactional
    @DisplayName("rejects a second personal record of the same type for the same exercise")
    void rejectsDuplicatedPersonalRecords() {
        User user = userRepository.save(new User(UUID.randomUUID(), "Bruno Lima", uniqueEmail("bruno"),
                "hash", UserRole.USER, "America/Sao_Paulo"));
        Exercise exercise = exerciseRepository.save(new Exercise(UUID.randomUUID(), "Remada curvada", null, "Costas",
                List.of(), "Barra", null, MovementType.COMPOUND));
        personalRecordRepository.save(new PersonalRecord(UUID.randomUUID(), user, exercise, RecordType.MAX_WEIGHT,
                new BigDecimal("100.00"), "kg", null, Instant.now()));
        personalRecordRepository.flush();

        assertThatThrownBy(() -> {
            personalRecordRepository.save(new PersonalRecord(UUID.randomUUID(), user, exercise, RecordType.MAX_WEIGHT,
                    new BigDecimal("105.00"), "kg", null, Instant.now()));
            personalRecordRepository.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    @DisplayName("seeds the global catalog of exercises")
    void seedsTheGlobalCatalog() {
        long systemExercises = exerciseRepository.findAll().stream()
                .filter(Exercise::isSystem)
                .count();

        assertThat(systemExercises).isGreaterThanOrEqualTo(40);
        assertThat(exerciseRepository.findAll().stream()
                .filter(exercise -> exercise.getCreatedByUserId() == null)
                .count()).isEqualTo(systemExercises);
    }

    /**
     * Builds an e-mail address that no other row can hold.
     *
     * <p>The test runs against a throwaway container or against a shared
     * PostgreSQL, so the e-mail cannot be a fixed value: the unique constraint
     * on {@code users.email} would collide with data left behind by a previous
     * execution.
     */
    private static String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@example.com";
    }
}
