package com.ironmind.exercise.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ironmind.exercise.entity.Exercise;
import com.ironmind.exercise.entity.MovementType;
import com.ironmind.exercise.repository.ExerciseRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Seeds the global exercise catalog.
 *
 * <p>The catalog is versioned with the source code, in {@code catalog/exercises.json}. The seed is
 * idempotent: an exercise whose name is already in the global catalog is not written again, so a
 * restart never duplicates the catalog and a new entry is picked up on the next start.
 *
 * <p>The identifiers are derived from the name, so a fresh database always gets the same
 * identifiers for the same catalog.
 */
@Component
public class CatalogSeeder implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(CatalogSeeder.class);

    private static final String RESOURCE = "catalog/exercises.json";
    private static final String ID_NAMESPACE = "ironmind:catalog:";

    private final ExerciseRepository exerciseRepository;
    private final ObjectMapper objectMapper;

    public CatalogSeeder(ExerciseRepository exerciseRepository, ObjectMapper objectMapper) {
        this.exerciseRepository = exerciseRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        List<CatalogEntry> catalog = readCatalog();
        Set<String> existing = new HashSet<>();
        for (Exercise exercise : exerciseRepository.findBySystemTrue()) {
            existing.add(normalize(exercise.getName()));
        }

        int inserted = 0;
        for (CatalogEntry entry : catalog) {
            if (!existing.add(normalize(entry.name()))) {
                continue;
            }
            exerciseRepository.save(toExercise(entry));
            inserted++;
        }
        LOG.info("Exercise catalog ready: {} entries, {} inserted", catalog.size(), inserted);
    }

    private List<CatalogEntry> readCatalog() throws IOException {
        ClassPathResource resource = new ClassPathResource(RESOURCE);
        try (InputStream input = resource.getInputStream()) {
            return List.of(objectMapper.readValue(input, CatalogEntry[].class));
        }
    }

    private static Exercise toExercise(CatalogEntry entry) {
        UUID id = UUID.nameUUIDFromBytes((ID_NAMESPACE + entry.name()).getBytes(StandardCharsets.UTF_8));
        return new Exercise(id, entry.name(), entry.description(), entry.primaryMuscleGroup(),
                entry.secondaryMuscleGroups(), entry.equipment(), entry.instructions(),
                entry.movementType());
    }

    private static String normalize(String name) {
        return name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Entry of the catalog file.
     *
     * @param name                 name of the exercise
     * @param description          short description of the movement
     * @param primaryMuscleGroup   main muscle group of the movement
     * @param secondaryMuscleGroups auxiliary muscle groups
     * @param equipment            equipment required by the movement
     * @param instructions         execution instructions
     * @param movementType         kind of movement
     */
    private record CatalogEntry(
            String name,
            String description,
            String primaryMuscleGroup,
            List<String> secondaryMuscleGroups,
            String equipment,
            String instructions,
            MovementType movementType) {
    }
}
