package com.ironmind.program.entity;

import java.util.UUID;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Training day of a program.
 *
 * <p>The day belongs to a program and holds the ordered exercises of the day. The exercises are
 * read through the repository of the program exercises, because the structure of a program is
 * always written and replaced as a whole (SPEC.md section 10.5).
 */
@Document(collection = "program_days")
public class ProgramDay {

    @Id
    private UUID id;

    @Indexed
    private UUID programId;

    private String name;

    private int position;

    protected ProgramDay() {
    }

    /**
     * Creates a day of the given program.
     *
     * @param id        identifier of the day
     * @param programId identifier of the program the day belongs to
     * @param name      name of the day, for example "Peito e tríceps"
     * @param position  position of the day inside the program, starting at one
     */
    public ProgramDay(UUID id, UUID programId, String name, int position) {
        this.id = id;
        this.programId = programId;
        this.name = name;
        this.position = position;
    }

    public UUID getId() {
        return id;
    }

    public UUID getProgramId() {
        return programId;
    }

    public String getName() {
        return name;
    }

    public int getPosition() {
        return position;
    }
}
