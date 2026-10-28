"""Sets: registration, server assigned numbering, correction, deletion and idempotency."""

import uuid

from support import (
    add_exercise,
    completed_session_with_set,
    expect,
    idempotency,
    new_user_id,
    open_session_with_exercise,
    register_set,
    start_session,
)

SUPINO = "Supino reto com barra"
REMADA = "Remada curvada"


def test_registers_sets_with_server_assigned_numbers(api, catalog):
    session, entry = open_session_with_exercise(api, catalog[SUPINO]["id"])

    first_response = register_set(api, session["id"], entry["id"], weight=80.0, repetitions=10,
                                  perceived_exertion=8, rest_after_seconds=90)
    first = expect(first_response, 201)

    assert first_response.headers["Location"] == f"/api/v1/sets/{first['id']}"
    assert first["setNumber"] == 1
    assert first["weightKg"] == 80.0
    assert first["repetitions"] == 10
    assert first["perceivedExertion"] == 8
    assert first["restAfterSeconds"] == 90
    assert first["durationSeconds"] is None
    assert first["distanceMeters"] is None
    assert first["completedAt"]

    second = expect(register_set(api, session["id"], entry["id"], weight=82.5, repetitions=8), 201)
    assert second["setNumber"] == 2

    fetched = expect(api.get(f"/api/v1/workout-sessions/{session['id']}"), 200)
    sets = fetched["exercises"][0]["sets"]
    assert [item["setNumber"] for item in sets] == [1, 2]
    assert [item["id"] for item in sets] == [first["id"], second["id"]]


def test_numbering_is_independent_per_exercise_of_the_session(api, catalog):
    session = start_session(api)
    supino = add_exercise(api, session["id"], catalog[SUPINO]["id"])
    remada = add_exercise(api, session["id"], catalog[REMADA]["id"])

    expect(register_set(api, session["id"], supino["id"], weight=60.0, repetitions=10), 201)
    first_remada = expect(register_set(api, session["id"], remada["id"], weight=50.0, repetitions=12), 201)

    assert first_remada["setNumber"] == 1


def test_bodyweight_sets_can_be_registered_many_times(api, catalog):
    """The unique sparse index of the durable idempotency key must not block bodyweight sets."""
    session, entry = open_session_with_exercise(api, catalog["Prancha"]["id"])

    first = expect(register_set(api, session["id"], entry["id"], weight=None, repetitions=30,
                                idempotency_key=None), 201)
    second = expect(register_set(api, session["id"], entry["id"], weight=None, repetitions=30,
                                 idempotency_key=None), 201)

    assert first["weightKg"] is None
    assert second["weightKg"] is None
    assert first["setNumber"] == 1
    assert second["setNumber"] == 2


def test_idempotency_key_replays_the_registration(api, catalog):
    session, entry = open_session_with_exercise(api, catalog[SUPINO]["id"])
    key = str(uuid.uuid4())

    first = expect(register_set(api, session["id"], entry["id"], weight=100.0, repetitions=5,
                                idempotency_key=key), 201)
    replay = register_set(api, session["id"], entry["id"], weight=100.0, repetitions=5,
                          idempotency_key=key)
    replayed = expect(replay, 200)
    assert replayed["id"] == first["id"]

    sets = expect(api.get(f"/api/v1/workout-sessions/{session['id']}"), 200)["exercises"][0]["sets"]
    assert len(sets) == 1

    reused = register_set(api, session["id"], entry["id"], weight=100.0, repetitions=6,
                          idempotency_key=key)
    assert expect(reused, 409)["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_the_same_key_of_two_users_does_not_collide(api, catalog):
    key = "shared-key-of-the-suite"

    first_session, first_entry = open_session_with_exercise(api, catalog[SUPINO]["id"])
    expect(register_set(api, first_session["id"], first_entry["id"], weight=50.0, repetitions=10,
                        idempotency_key=key), 201)

    other = api.as_user(new_user_id())
    second_session, second_entry = open_session_with_exercise(other, catalog[SUPINO]["id"])
    created = expect(register_set(other, second_session["id"], second_entry["id"], weight=70.0,
                                  repetitions=8, idempotency_key=key), 201)
    assert created["weightKg"] == 70.0


def test_rejects_invalid_set_values(api, catalog):
    session, entry = open_session_with_exercise(api, catalog[SUPINO]["id"])
    path = f"/api/v1/workout-sessions/{session['id']}/sets"

    missing_reps = expect(
        api.post(path, json={"sessionExerciseId": entry["id"], "weightKg": 80.0}), 422
    )
    assert missing_reps["fieldErrors"][0]["field"] == "repetitions"

    negative_weight = expect(
        api.post(path, json={"sessionExerciseId": entry["id"], "weightKg": -1.0, "repetitions": 5}),
        422,
    )
    assert negative_weight["fieldErrors"][0]["field"] == "weightKg"

    too_precise = expect(
        api.post(path, json={"sessionExerciseId": entry["id"], "weightKg": 80.123, "repetitions": 5}),
        422,
    )
    assert too_precise["fieldErrors"][0]["field"] == "weightKg"

    invalid_effort = expect(
        api.post(path, json={"sessionExerciseId": entry["id"], "weightKg": 80.0,
                             "repetitions": 5, "perceivedExertion": 11}),
        422,
    )
    assert invalid_effort["fieldErrors"][0]["field"] == "perceivedExertion"

    assert expect(api.get(f"/api/v1/workout-sessions/{session['id']}"), 200)["exercises"][0]["sets"] == []


def test_registration_rejects_unknown_exercise_or_session(api, catalog):
    session, entry = open_session_with_exercise(api, catalog[SUPINO]["id"])

    unknown_session = register_set(api, str(uuid.uuid4()), entry["id"], weight=80.0, repetitions=5)
    assert expect(unknown_session, 404)["code"] == "NOT_FOUND"

    unknown_entry = register_set(api, session["id"], str(uuid.uuid4()), weight=80.0, repetitions=5)
    assert expect(unknown_entry, 404)["code"] == "NOT_FOUND"

    other_session, _ = open_session_with_exercise(api, catalog[REMADA]["id"])
    wrong_session = register_set(api, other_session["id"], entry["id"], weight=80.0, repetitions=5)
    assert expect(wrong_session, 404)["code"] == "NOT_FOUND"


def test_corrects_a_set_keeping_identity_and_number(api, catalog):
    session, entry = open_session_with_exercise(api, catalog[SUPINO]["id"])
    registered = expect(register_set(api, session["id"], entry["id"], weight=100.0, repetitions=5,
                                     perceived_exertion=9, rest_after_seconds=120), 201)

    updated = expect(
        api.patch(f"/api/v1/sets/{registered['id']}", json={"repetitions": 6, "perceivedExertion": 7}),
        200,
    )
    assert updated["id"] == registered["id"]
    assert updated["setNumber"] == registered["setNumber"] == 1
    assert updated["weightKg"] == 100.0
    assert updated["repetitions"] == 6
    assert updated["perceivedExertion"] == 7
    assert updated["restAfterSeconds"] == 120

    bodyweight = expect(api.patch(f"/api/v1/sets/{registered['id']}", json={"weightKg": None}), 200)
    assert bodyweight["weightKg"] is None
    assert bodyweight["repetitions"] == 6

    assert expect(
        api.patch(f"/api/v1/sets/{registered['id']}", json={"weightKg": 12345}), 422
    )["fieldErrors"][0]["field"] == "weightKg"

    assert expect(api.patch(f"/api/v1/sets/{uuid.uuid4()}", json={"repetitions": 5}), 404)["code"] == "NOT_FOUND"


def test_deletes_a_set(api, catalog):
    session, entry = open_session_with_exercise(api, catalog[SUPINO]["id"])
    first = expect(register_set(api, session["id"], entry["id"], weight=100.0, repetitions=5), 201)
    second = expect(register_set(api, session["id"], entry["id"], weight=90.0, repetitions=5), 201)

    response = api.delete(f"/api/v1/sets/{first['id']}")
    assert response.status_code == 204
    assert response.content == b""

    remaining = expect(api.get(f"/api/v1/workout-sessions/{session['id']}"), 200)["exercises"][0]["sets"]
    assert [item["id"] for item in remaining] == [second["id"]]

    assert api.delete(f"/api/v1/sets/{first['id']}").status_code == 404


def test_finalized_sessions_refuse_set_changes(api, catalog):
    session = completed_session_with_set(api, catalog[SUPINO]["id"], weight=100.0, repetitions=5)
    entry = session["exercises"][0]
    set_id = entry["sets"][0]["id"]

    late_set = register_set(api, session["id"], entry["id"], weight=100.0, repetitions=5)
    assert expect(late_set, 409)["code"] == "CONFLICT"

    corrected = expect(api.patch(f"/api/v1/sets/{set_id}", json={"repetitions": 4}), 409)
    assert corrected["code"] == "CONFLICT"

    assert api.delete(f"/api/v1/sets/{set_id}").status_code == 409
