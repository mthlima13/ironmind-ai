-- =============================================================================
-- IronMind AI - Sprint 3: the plan of the exercise in the session
--
-- When a session starts from a program day, the plan of each exercise is
-- copied into the session, so the history keeps the plan as it was on the
-- day of the workout (SPEC 7.6 - preservation of history).
--
-- The columns were missing: the plan used to travel inside the observations
-- of the session exercise, as a readable text ("4x6-8 (descanso 150s)").
-- A text cannot be queried nor compared with what was performed, so the
-- targets get their own columns and the observations keep the readable
-- summary for the user.
-- =============================================================================

ALTER TABLE session_exercises
    ADD COLUMN target_sets integer,
    ADD COLUMN target_reps_min integer,
    ADD COLUMN target_reps_max integer,
    ADD COLUMN rest_seconds integer;

ALTER TABLE session_exercises
    ADD CONSTRAINT ck_session_exercises_target_sets
        CHECK (target_sets IS NULL OR target_sets >= 1),
    ADD CONSTRAINT ck_session_exercises_target_reps
        CHECK (target_reps_min IS NULL OR target_reps_max IS NULL OR target_reps_max >= target_reps_min),
    ADD CONSTRAINT ck_session_exercises_rest_seconds
        CHECK (rest_seconds IS NULL OR rest_seconds >= 0);
