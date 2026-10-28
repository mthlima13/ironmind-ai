"""Workout sessions: lifecycle, copy of the program day, exercises and listing."""

import time
import uuid

from support import (
    add_exercise,
    create_program,
    expect,
    idempotency,
    program_day,
    program_exercise,
    start_session,
)

SUPINO = "Supino reto com barra"
REMADA = "Remada curvada"
LEG_PRESS = "Leg press 45 graus"


def test_starts_a_free_session_without_exercises(api):
    response = api.post("/api/v1/workout-sessions", json={})
    session = expect(response, 201)

    assert response.headers["Location"] == f"/api/v1/workout-sessions/{session['id']}"
    assert session["status"] == "IN_PROGRESS"
    assert session["programId"] is None
    assert session["programDayId"] is None
    assert session["startedAt"]
    assert session["completedAt"] is None
    assert session["notes"] is None
    assert session["exercises"] == []


def test_starts_a_session_from_a_program_day_and_copies_the_plan(api, catalog):
    program = create_program(
        api,
        days=[
            program_day(
                "Push",
                [
                    program_exercise(catalog[SUPINO]["id"], sets=4, reps_min=6, reps_max=8,
                                     rest=150, notes="Controlar a descida"),
                    program_exercise(catalog[REMADA]["id"], sets=3, reps_min=8, reps_max=12),
                ],
            )
        ],
    )
    day = program["days"][0]

    session = start_session(api, program_id=program["id"], day_id=day["id"])

    assert session["programId"] == program["id"]
    assert session["programDayId"] == day["id"]
    assert session["status"] == "IN_PROGRESS"
    assert [exercise["position"] for exercise in session["exercises"]] == [1, 2]
    assert [exercise["exerciseId"] for exercise in session["exercises"]] == [
        catalog[SUPINO]["id"],
        catalog[REMADA]["id"],
    ]

    first = session["exercises"][0]
    assert first["sets"] == []
    assert first["targetSets"] == 4
    assert first["targetRepsMin"] == 6
    assert first["targetRepsMax"] == 8
    assert first["restSeconds"] == 150
    assert first["notes"] == "4x6-8 (descanso 150s) — Controlar a descida"
    assert first["exercise"]["name"] == SUPINO

    # The snapshot survives a later change of the program.
    replacement = {
        "name": "Outro nome",
        "description": None,
        "goal": "STRENGTH",
        "splitType": "FULL_BODY",
        "days": [program_day("Outro dia", [program_exercise(catalog[LEG_PRESS]["id"])])],
    }
    expect(api.put(f"/api/v1/programs/{program['id']}", json=replacement), 200)
    fetched = expect(api.get(f"/api/v1/workout-sessions/{session['id']}"), 200)
    assert [exercise["exerciseId"] for exercise in fetched["exercises"]] == [
        catalog[SUPINO]["id"],
        catalog[REMADA]["id"],
    ]
    assert fetched["exercises"][0]["targetSets"] == 4


def test_starting_from_a_day_of_another_program_is_rejected(api, catalog):
    first = create_program(api)
    second = create_program(
        api,
        name="Outro",
        days=[program_day("Pull", [program_exercise(catalog[REMADA]["id"])])],
    )

    body = expect(
        api.post(
            "/api/v1/workout-sessions",
            json={"programId": first["id"], "programDayId": second["days"][0]["id"]},
        ),
        422,
    )
    assert body["code"] == "VALIDATION_ERROR"
    assert body["fieldErrors"][0]["field"] == "programDayId"


def test_starting_from_an_unknown_day_is_not_found(api, catalog):
    program = create_program(api)
    body = expect(
        api.post(
            "/api/v1/workout-sessions",
            json={"programId": program["id"], "programDayId": str(uuid.uuid4())},
        ),
        404,
    )
    assert body["code"] == "NOT_FOUND"


def test_adds_exercises_and_rejects_duplicates_and_taken_positions(api, catalog):
    session = start_session(api)
    first = add_exercise(api, session["id"], catalog[SUPINO]["id"], notes="Pegada aberta")

    assert first["position"] == 1
    assert first["notes"] == "Pegada aberta"
    assert first["exerciseId"] == catalog[SUPINO]["id"]
    assert first["exercise"]["name"] == SUPINO
    assert first["sets"] == []
    assert first["targetSets"] is None

    second = add_exercise(api, session["id"], catalog[REMADA]["id"])
    assert second["position"] == 2

    duplicate = expect(
        api.post(
            f"/api/v1/workout-sessions/{session['id']}/exercises",
            json={"exerciseId": catalog[SUPINO]["id"], "position": 3},
        ),
        409,
    )
    assert duplicate["code"] == "CONFLICT"

    taken = expect(
        api.post(
            f"/api/v1/workout-sessions/{session['id']}/exercises",
            json={"exerciseId": catalog[LEG_PRESS]["id"], "position": 1},
        ),
        409,
    )
    assert taken["code"] == "CONFLICT"

    unknown = expect(
        api.post(
            f"/api/v1/workout-sessions/{session['id']}/exercises",
            json={"exerciseId": str(uuid.uuid4())},
        ),
        422,
    )
    assert unknown["fieldErrors"][0]["field"] == "exerciseId"

    fetched = expect(api.get(f"/api/v1/workout-sessions/{session['id']}"), 200)
    assert [exercise["exerciseId"] for exercise in fetched["exercises"]] == [
        catalog[SUPINO]["id"],
        catalog[REMADA]["id"],
    ]


def test_idempotency_key_replays_the_session_and_the_exercise(api, catalog):
    key = str(uuid.uuid4())
    first = start_session(api, idempotency_key=key)
    replay = expect(api.post("/api/v1/workout-sessions", json={},
                             headers=idempotency(key)), 200)
    assert replay["id"] == first["id"]
    assert expect(api.get("/api/v1/workout-sessions"), 200)["totalElements"] == 1

    exercise_key = str(uuid.uuid4())
    entry = add_exercise(api, first["id"], catalog[SUPINO]["id"], idempotency_key=exercise_key)
    replayed = expect(
        api.post(
            f"/api/v1/workout-sessions/{first['id']}/exercises",
            json={"exerciseId": catalog[SUPINO]["id"]},
            headers=idempotency(exercise_key),
        ),
        200,
    )
    assert replayed["id"] == entry["id"]

    reused = expect(
        api.post(
            f"/api/v1/workout-sessions/{first['id']}/exercises",
            json={"exerciseId": catalog[REMADA]["id"]},
            headers=idempotency(exercise_key),
        ),
        409,
    )
    assert reused["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_pauses_resumes_and_abandons(api):
    session = start_session(api)

    paused = expect(
        api.patch(f"/api/v1/workout-sessions/{session['id']}",
                  json={"status": "PAUSED", "notes": "Intervalo"}),
        200,
    )
    assert paused["status"] == "PAUSED"
    assert paused["notes"] == "Intervalo"

    resumed = expect(
        api.patch(f"/api/v1/workout-sessions/{session['id']}", json={"status": "IN_PROGRESS"}), 200
    )
    assert resumed["status"] == "IN_PROGRESS"
    assert resumed["notes"] == "Intervalo"

    abandoned = expect(
        api.patch(f"/api/v1/workout-sessions/{session['id']}", json={"status": "ABANDONED"}), 200
    )
    assert abandoned["status"] == "ABANDONED"
    assert abandoned["completedAt"] is None

    # An abandoned session is final: no new exercise, no set, no completion.
    assert (
        expect(
            api.post(f"/api/v1/workout-sessions/{session['id']}/exercises",
                     json={"exerciseId": str(uuid.uuid4())}),
            409,
        )["code"]
        == "CONFLICT"
    )
    assert expect(api.post(f"/api/v1/workout-sessions/{session['id']}/complete"), 409)["code"] == "CONFLICT"
    assert (
        expect(
            api.patch(f"/api/v1/workout-sessions/{session['id']}", json={"status": "PAUSED"}), 409
        )["code"]
        == "CONFLICT"
    )


def test_completes_a_session_once(api):
    session = start_session(api)

    completed = expect(api.post(f"/api/v1/workout-sessions/{session['id']}/complete"), 200)
    assert completed["status"] == "COMPLETED"
    assert completed["completedAt"]
    assert completed["startedAt"] <= completed["completedAt"]

    again = expect(api.post(f"/api/v1/workout-sessions/{session['id']}/complete"), 409)
    assert again["code"] == "CONFLICT"

    assert (
        expect(
            api.patch(f"/api/v1/workout-sessions/{session['id']}", json={"status": "IN_PROGRESS"}),
            409,
        )["code"]
        == "CONFLICT"
    )


def test_rejects_status_outside_the_enum(api):
    session = start_session(api)
    body = expect(
        api.patch(f"/api/v1/workout-sessions/{session['id']}", json={"status": "DONE"}), 422
    )
    assert body["code"] == "VALIDATION_ERROR"


def test_lists_sessions_newest_first_with_pagination(api):
    created = []
    for _ in range(3):
        created.append(start_session(api))
        time.sleep(0.02)

    page = expect(api.get("/api/v1/workout-sessions", params={"page": 0, "size": 10}), 200)
    assert page["totalElements"] == 3
    assert page["totalPages"] == 1
    assert page["hasNext"] is False
    ids = [session["id"] for session in page["content"]]
    assert ids == [session["id"] for session in reversed(created)]
    started = [session["startedAt"] for session in page["content"]]
    assert started == sorted(started, reverse=True)

    first_page = expect(api.get("/api/v1/workout-sessions", params={"page": 0, "size": 2}), 200)
    assert first_page["hasNext"] is True
    assert len(first_page["content"]) == 2

    second_page = expect(api.get("/api/v1/workout-sessions", params={"page": 1, "size": 2}), 200)
    assert second_page["hasNext"] is False
    assert [session["id"] for session in second_page["content"]] == [created[0]["id"]]

    explicit = expect(
        api.get("/api/v1/workout-sessions", params={"sort": "startedAt,asc", "size": 10}), 200
    )
    assert [session["id"] for session in explicit["content"]] == [session["id"] for session in created]


def test_rejects_invalid_pagination(api):
    assert expect(api.get("/api/v1/workout-sessions", params={"size": 0}), 422)["code"] == "VALIDATION_ERROR"
    assert expect(api.get("/api/v1/workout-sessions", params={"size": 101}), 422)["code"] == "VALIDATION_ERROR"
    assert expect(api.get("/api/v1/workout-sessions", params={"page": -1}), 422)["code"] == "VALIDATION_ERROR"


def test_unknown_session_is_not_found(api):
    body = expect(api.get(f"/api/v1/workout-sessions/{uuid.uuid4()}"), 404)
    assert body["code"] == "NOT_FOUND"
