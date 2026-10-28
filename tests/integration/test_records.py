"""Personal records: recalculated by the server whenever a set changes."""

import time

from support import (
    completed_session_with_set,
    decimal_of,
    expect,
    open_session_with_exercise,
    register_set,
)

SUPINO = "Supino reto com barra"


def _records_by_type(api, exercise_id: str) -> dict[str, dict]:
    page = expect(api.get("/api/v1/records", params={"size": 100}), 200)
    return {
        record["recordType"]: record
        for record in page["content"]
        if record["exerciseId"] == exercise_id
    }


def test_a_completed_set_creates_every_record_type(api, catalog):
    exercise_id = catalog[SUPINO]["id"]
    completed_session_with_set(api, exercise_id, weight=100.0, repetitions=5)

    page = expect(api.get("/api/v1/records"), 200)
    assert page["totalElements"] == 3
    assert set(page) == {"content", "page", "size", "totalElements", "totalPages", "hasNext"}

    records = _records_by_type(api, exercise_id)
    assert set(records) == {"MAX_WEIGHT", "MAX_REPS_AT_WEIGHT", "BEST_ESTIMATED_1RM"}

    assert decimal_of(records["MAX_WEIGHT"]["value"]) == decimal_of(100)
    assert records["MAX_WEIGHT"]["unit"] == "kg"

    assert records["MAX_REPS_AT_WEIGHT"]["value"] == 5
    assert records["MAX_REPS_AT_WEIGHT"]["unit"] == "reps"

    # Brzycki: 100 * 36 / (37 - 5) = 112.5
    assert decimal_of(records["BEST_ESTIMATED_1RM"]["value"]) == decimal_of("112.50")
    assert records["BEST_ESTIMATED_1RM"]["unit"] == "kg (estimado)"

    for record in records.values():
        assert record["exerciseName"] == SUPINO
        assert record["achievedAt"]
        assert record["id"]

    achieved = [record["achievedAt"] for record in page["content"]]
    assert achieved == sorted(achieved, reverse=True)


def test_a_heavier_set_does_not_necessarily_beat_the_estimated_one_rep_max(api, catalog):
    exercise_id = catalog[SUPINO]["id"]

    session, entry = open_session_with_exercise(api, exercise_id)
    expect(register_set(api, session["id"], entry["id"], weight=100.0, repetitions=5), 201)
    expect(register_set(api, session["id"], entry["id"], weight=105.0, repetitions=3), 201)

    records = _records_by_type(api, exercise_id)
    assert decimal_of(records["MAX_WEIGHT"]["value"]) == decimal_of(105)
    # 105 * 36 / (37 - 3) = 111.18, below the 112.5 of 100 x 5.
    assert decimal_of(records["BEST_ESTIMATED_1RM"]["value"]) == decimal_of("112.50")
    assert records["MAX_REPS_AT_WEIGHT"]["value"] == 5


def test_correcting_a_set_downwards_recalculates_the_records(api, catalog):
    exercise_id = catalog[SUPINO]["id"]

    session, entry = open_session_with_exercise(api, exercise_id)
    registered = expect(register_set(api, session["id"], entry["id"], weight=100.0, repetitions=5), 201)
    assert decimal_of(_records_by_type(api, exercise_id)["MAX_WEIGHT"]["value"]) == decimal_of(100)

    expect(api.patch(f"/api/v1/sets/{registered['id']}", json={"weightKg": 90.0, "repetitions": 5}), 200)

    records = _records_by_type(api, exercise_id)
    assert decimal_of(records["MAX_WEIGHT"]["value"]) == decimal_of(90)
    assert decimal_of(records["BEST_ESTIMATED_1RM"]["value"]) == decimal_of("101.25")


def test_deleting_the_last_set_removes_the_records(api, catalog):
    exercise_id = catalog[SUPINO]["id"]

    session, entry = open_session_with_exercise(api, exercise_id)
    first = expect(register_set(api, session["id"], entry["id"], weight=100.0, repetitions=5), 201)
    second = expect(register_set(api, session["id"], entry["id"], weight=80.0, repetitions=8), 201)

    assert api.delete(f"/api/v1/sets/{first['id']}").status_code == 204
    records = _records_by_type(api, exercise_id)
    assert decimal_of(records["MAX_WEIGHT"]["value"]) == decimal_of(80)
    assert records["MAX_REPS_AT_WEIGHT"]["value"] == 8

    assert api.delete(f"/api/v1/sets/{second['id']}").status_code == 204
    assert _records_by_type(api, exercise_id) == {}
    assert expect(api.get("/api/v1/records"), 200)["content"] == []


def test_repetitions_outside_the_formula_range_have_no_estimated_one_rep_max(api, catalog):
    exercise_id = catalog[SUPINO]["id"]
    completed_session_with_set(api, exercise_id, weight=80.0, repetitions=12)

    records = _records_by_type(api, exercise_id)
    assert "BEST_ESTIMATED_1RM" not in records
    assert decimal_of(records["MAX_WEIGHT"]["value"]) == decimal_of(80)
    assert records["MAX_REPS_AT_WEIGHT"]["value"] == 12


def test_bodyweight_sets_create_no_record(api, catalog):
    exercise_id = catalog["Prancha"]["id"]
    session, entry = open_session_with_exercise(api, exercise_id)
    expect(register_set(api, session["id"], entry["id"], weight=None, repetitions=30), 201)
    expect(api.post(f"/api/v1/workout-sessions/{session['id']}/complete"), 200)

    assert expect(api.get("/api/v1/records"), 200)["content"] == []


def test_records_of_two_exercises_are_independent(api, catalog):
    completed_session_with_set(api, catalog[SUPINO]["id"], weight=100.0, repetitions=5)
    time.sleep(0.02)
    completed_session_with_set(api, catalog["Remada curvada"]["id"], weight=60.0, repetitions=8)

    page = expect(api.get("/api/v1/records", params={"size": 100}), 200)
    assert page["totalElements"] == 6
    names = {record["exerciseName"] for record in page["content"]}
    assert names == {SUPINO, "Remada curvada"}

    latest = page["content"][0]
    assert latest["exerciseName"] == "Remada curvada"


def test_rejects_invalid_record_pagination(api):
    assert expect(api.get("/api/v1/records", params={"size": 101}), 422)["code"] == "VALIDATION_ERROR"
    assert expect(api.get("/api/v1/records", params={"page": -1}), 422)["code"] == "VALIDATION_ERROR"
