package com.ironmind.program.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;

/**
 * Training day of a program.
 *
 * <p>The day belongs to a program and holds the ordered exercises of the day. The exercises are
 * read through the repository of the program exercises, because the structure of a program is
 * always written and replaced as a whole (SPEC.md section 10.5).
 */
@Entity
@Table(name = "program_days")
public class ProgramDay {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "program_id", nullable = false)
    private WorkoutProgram program;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "position", nullable = false)
    private int position;

    protected ProgramDay() {
    }

    /**
     * Creates a day of the given program.
     *
     * @param id       identifier of the day
     * @param program  program the day belongs to
     * @param name     name of the day, for example "Peito e tríceps"
     * @param position position of the day inside the program, starting at one
     */
    public ProgramDay(UUID id, WorkoutProgram program, String name, int position) {
        this.id = id;
        this.program = program;
        this.name = name;
        this.position = position;
    }

    public UUID getId() {
        return id;
    }

    public WorkoutProgram getProgram() {
        return program;
    }

    public String getName() {
        return name;
    }

    public int getPosition() {
        return position;
    }
}
