-- =============================================================================
-- IronMind AI - baseline schema
-- Source of truth: SPEC.md section 10 (data model) and appendix A (contracts).
--
-- Conventions:
--   * UUID primary key in every table.
--   * Timestamps are timestamptz and default to now().
--   * The canonical unit of load is the kilogram (weight_kg numeric(6,2)).
--   * Enum values are native PostgreSQL enum types.
--   * Foreign keys declare the ON DELETE behaviour explicitly.
-- =============================================================================

-- gen_random_uuid() is part of the core of PostgreSQL 13+, so the schema does
-- not depend on any extension that would require elevated privileges.

-- -----------------------------------------------------------------------------
-- Enum types
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('USER', 'CREATOR', 'ADMIN');
CREATE TYPE preferred_units AS ENUM ('KG', 'LB');
CREATE TYPE training_experience AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE training_goal AS ENUM ('HYPERTROPHY', 'STRENGTH', 'ENDURANCE', 'GENERAL');
CREATE TYPE movement_type AS ENUM ('COMPOUND', 'ISOLATION', 'CARDIO', 'ISOMETRIC');
CREATE TYPE split_type AS ENUM ('PPL', 'UPPER_LOWER', 'FULL_BODY', 'CUSTOM');
CREATE TYPE session_status AS ENUM ('IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED');
CREATE TYPE record_type AS ENUM ('MAX_WEIGHT', 'MAX_REPS_AT_WEIGHT', 'BEST_ESTIMATED_1RM');
CREATE TYPE recommendation_type AS ENUM ('WORKOUT_PROGRAM', 'LOAD_SUGGESTION', 'COACH_REPLY');
CREATE TYPE recommendation_status AS ENUM ('PENDING', 'ACCEPTED', 'EDITED', 'REJECTED', 'ERROR');

-- -----------------------------------------------------------------------------
-- 10.1 users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          varchar(120) NOT NULL,
    email         varchar(255) NOT NULL,
    password_hash varchar(255) NOT NULL,
    role          user_role NOT NULL DEFAULT 'USER',
    timezone      varchar(64)  NOT NULL DEFAULT 'America/Sao_Paulo',
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- -----------------------------------------------------------------------------
-- 10.2 user_preferences
-- -----------------------------------------------------------------------------
CREATE TABLE user_preferences (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL,
    preferred_units     preferred_units     NOT NULL DEFAULT 'KG',
    training_experience training_experience NOT NULL DEFAULT 'BEGINNER',
    goal                training_goal        NOT NULL DEFAULT 'GENERAL',
    available_equipment jsonb               NOT NULL DEFAULT '[]'::jsonb,
    training_days       smallint            NOT NULL DEFAULT 3,
    privacy_settings    jsonb               NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uq_user_preferences_user UNIQUE (user_id),
    CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_user_preferences_training_days CHECK (training_days BETWEEN 1 AND 7)
);

CREATE INDEX idx_user_preferences_user ON user_preferences (user_id);

-- -----------------------------------------------------------------------------
-- 10.3 exercises
-- -----------------------------------------------------------------------------
CREATE TABLE exercises (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  varchar(120)  NOT NULL,
    description           text,
    primary_muscle_group  varchar(60)   NOT NULL,
    secondary_muscle_groups jsonb       NOT NULL DEFAULT '[]'::jsonb,
    equipment             varchar(60)   NOT NULL,
    instructions          text,
    movement_type         movement_type NOT NULL,
    is_system             boolean       NOT NULL DEFAULT false,
    created_by_user_id    uuid,
    created_at            timestamptz   NOT NULL DEFAULT now(),
    updated_at            timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT fk_exercises_created_by_user FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE CASCADE,
    -- A global exercise is readable by everyone and has no owner.
    CONSTRAINT ck_exercises_global_without_owner CHECK (NOT is_system OR created_by_user_id IS NULL)
);

CREATE INDEX idx_exercises_created_by_user ON exercises (created_by_user_id);
CREATE INDEX idx_exercises_muscle_group ON exercises (primary_muscle_group);
CREATE INDEX idx_exercises_equipment ON exercises (equipment);
CREATE INDEX idx_exercises_system ON exercises (is_system);

-- -----------------------------------------------------------------------------
-- 10.4 workout_programs
-- -----------------------------------------------------------------------------
CREATE TABLE workout_programs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL,
    name        varchar(120) NOT NULL,
    description text,
    goal        training_goal NOT NULL DEFAULT 'GENERAL',
    split_type  split_type   NOT NULL DEFAULT 'CUSTOM',
    is_archived boolean      NOT NULL DEFAULT false,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT fk_workout_programs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_workout_programs_user ON workout_programs (user_id);
CREATE INDEX idx_workout_programs_user_archived ON workout_programs (user_id, is_archived);

-- -----------------------------------------------------------------------------
-- 10.5 program_days
-- -----------------------------------------------------------------------------
CREATE TABLE program_days (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id uuid NOT NULL,
    name       varchar(120) NOT NULL,
    position   int         NOT NULL,
    CONSTRAINT fk_program_days_program FOREIGN KEY (program_id) REFERENCES workout_programs (id) ON DELETE CASCADE,
    CONSTRAINT uq_program_days_position UNIQUE (program_id, position)
);

CREATE INDEX idx_program_days_program ON program_days (program_id);

-- -----------------------------------------------------------------------------
-- 10.6 program_exercises
-- -----------------------------------------------------------------------------
CREATE TABLE program_exercises (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    program_day_id  uuid NOT NULL,
    exercise_id     uuid NOT NULL,
    position        int  NOT NULL,
    target_sets     int  NOT NULL DEFAULT 3,
    target_reps_min int  NOT NULL DEFAULT 8,
    target_reps_max int  NOT NULL DEFAULT 12,
    rest_seconds    int,
    notes           text,
    CONSTRAINT fk_program_exercises_program_day FOREIGN KEY (program_day_id) REFERENCES program_days (id) ON DELETE CASCADE,
    CONSTRAINT fk_program_exercises_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
    CONSTRAINT uq_program_exercises_position UNIQUE (program_day_id, position),
    CONSTRAINT ck_program_exercises_reps CHECK (target_reps_min <= target_reps_max),
    CONSTRAINT ck_program_exercises_sets CHECK (target_sets > 0)
);

CREATE INDEX idx_program_exercises_program_day ON program_exercises (program_day_id);
CREATE INDEX idx_program_exercises_exercise ON program_exercises (exercise_id);

-- -----------------------------------------------------------------------------
-- 10.7 workout_sessions
-- -----------------------------------------------------------------------------
CREATE TABLE workout_sessions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        uuid NOT NULL,
    program_id     uuid,
    program_day_id uuid,
    started_at     timestamptz   NOT NULL DEFAULT now(),
    completed_at   timestamptz,
    status         session_status NOT NULL DEFAULT 'IN_PROGRESS',
    notes          text,
    created_at     timestamptz   NOT NULL DEFAULT now(),
    CONSTRAINT fk_workout_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    -- Changing or removing a program never changes a session that already happened.
    CONSTRAINT fk_workout_sessions_program FOREIGN KEY (program_id) REFERENCES workout_programs (id) ON DELETE SET NULL,
    CONSTRAINT fk_workout_sessions_program_day FOREIGN KEY (program_day_id) REFERENCES program_days (id) ON DELETE SET NULL,
    CONSTRAINT ck_workout_sessions_completed CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX idx_workout_sessions_user_started ON workout_sessions (user_id, started_at DESC);
CREATE INDEX idx_workout_sessions_status ON workout_sessions (status);
CREATE INDEX idx_workout_sessions_program ON workout_sessions (program_id);

-- -----------------------------------------------------------------------------
-- 10.8 session_exercises
-- -----------------------------------------------------------------------------
CREATE TABLE session_exercises (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  uuid NOT NULL,
    exercise_id uuid NOT NULL,
    position    int  NOT NULL,
    notes       text,
    CONSTRAINT fk_session_exercises_session FOREIGN KEY (session_id) REFERENCES workout_sessions (id) ON DELETE CASCADE,
    CONSTRAINT fk_session_exercises_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
    CONSTRAINT uq_session_exercises_position UNIQUE (session_id, position)
);

CREATE INDEX idx_session_exercises_session ON session_exercises (session_id);
CREATE INDEX idx_session_exercises_exercise ON session_exercises (exercise_id);

-- -----------------------------------------------------------------------------
-- 10.9 exercise_sets
-- -----------------------------------------------------------------------------
CREATE TABLE exercise_sets (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_exercise_id uuid NOT NULL,
    set_number          int NOT NULL,
    -- Canonical unit: kilogram. NULL for bodyweight movements.
    weight_kg           numeric(6,2),
    repetitions         int NOT NULL,
    duration_seconds    int,
    distance_meters     int,
    perceived_exertion  smallint,
    rest_after_seconds  int,
    completed_at        timestamptz NOT NULL DEFAULT now(),
    created_at          timestamptz NOT NULL DEFAULT now(),
    idempotency_key     varchar(120),
    CONSTRAINT fk_exercise_sets_session_exercise FOREIGN KEY (session_exercise_id) REFERENCES session_exercises (id) ON DELETE CASCADE,
    CONSTRAINT uq_exercise_sets_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT uq_exercise_sets_number UNIQUE (session_exercise_id, set_number),
    CONSTRAINT ck_exercise_sets_weight CHECK (weight_kg IS NULL OR weight_kg >= 0),
    CONSTRAINT ck_exercise_sets_repetitions CHECK (repetitions >= 0),
    CONSTRAINT ck_exercise_sets_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    CONSTRAINT ck_exercise_sets_distance CHECK (distance_meters IS NULL OR distance_meters >= 0),
    CONSTRAINT ck_exercise_sets_exertion CHECK (perceived_exertion IS NULL OR perceived_exertion BETWEEN 1 AND 10)
);

CREATE INDEX idx_exercise_sets_session_exercise ON exercise_sets (session_exercise_id);
CREATE INDEX idx_exercise_sets_completed_at ON exercise_sets (completed_at);

-- -----------------------------------------------------------------------------
-- 10.10 personal_records
-- -----------------------------------------------------------------------------
CREATE TABLE personal_records (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL,
    exercise_id   uuid NOT NULL,
    record_type   record_type NOT NULL,
    value         numeric(8,2) NOT NULL,
    unit          varchar(16) NOT NULL,
    source_set_id uuid,
    achieved_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_personal_records_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_personal_records_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
    CONSTRAINT fk_personal_records_source_set FOREIGN KEY (source_set_id) REFERENCES exercise_sets (id) ON DELETE SET NULL,
    CONSTRAINT uq_personal_records_user_exercise_type UNIQUE (user_id, exercise_id, record_type)
);

CREATE INDEX idx_personal_records_user ON personal_records (user_id);
CREATE INDEX idx_personal_records_exercise ON personal_records (exercise_id);

-- -----------------------------------------------------------------------------
-- 10.11 injury_restrictions
-- -----------------------------------------------------------------------------
CREATE TABLE injury_restrictions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL,
    body_region  varchar(80) NOT NULL,
    description  text NOT NULL,
    is_active    boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_injury_restrictions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_injury_restrictions_user ON injury_restrictions (user_id);
CREATE INDEX idx_injury_restrictions_user_active ON injury_restrictions (user_id, is_active);

-- -----------------------------------------------------------------------------
-- 10.12 restriction_exercises (associative, composite primary key)
-- -----------------------------------------------------------------------------
CREATE TABLE restriction_exercises (
    restriction_id uuid NOT NULL,
    exercise_id    uuid NOT NULL,
    CONSTRAINT pk_restriction_exercises PRIMARY KEY (restriction_id, exercise_id),
    CONSTRAINT fk_restriction_exercises_restriction FOREIGN KEY (restriction_id) REFERENCES injury_restrictions (id) ON DELETE CASCADE,
    CONSTRAINT fk_restriction_exercises_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
);

CREATE INDEX idx_restriction_exercises_exercise ON restriction_exercises (exercise_id);

-- -----------------------------------------------------------------------------
-- 10.13 ai_recommendations
-- -----------------------------------------------------------------------------
CREATE TABLE ai_recommendations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL,
    recommendation_type recommendation_type   NOT NULL,
    input_summary       text,
    result_json         jsonb                  NOT NULL DEFAULT '{}'::jsonb,
    model_version       varchar(120),
    status              recommendation_status NOT NULL DEFAULT 'PENDING',
    created_at          timestamptz NOT NULL DEFAULT now(),
    accepted_at         timestamptz,
    CONSTRAINT fk_ai_recommendations_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_recommendations_user ON ai_recommendations (user_id);
CREATE INDEX idx_ai_recommendations_status ON ai_recommendations (status);
