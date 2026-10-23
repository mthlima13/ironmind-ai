-- Sprint 4 keeps records derived from exercise_sets. The unique key (user_id, exercise_id, record_type)
-- remains sufficient for MAX_WEIGHT, MAX_REPS_AT_WEIGHT and BEST_ESTIMATED_1RM because the
-- recalculation stores at most one value per type.
-- No schema change is required for the record storage: this migration documents the invariant.
SELECT 1;
