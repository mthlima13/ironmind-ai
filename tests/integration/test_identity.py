"""Isolation between identities: foreign data is always answered with 404."""

import uuid

from support import (
    add_exercise,
    completed_session_with_set,
    create_program,
    decimal_of,
    expect,
    new_user_id,
    program_day,
    program_exercise,
    program_payload,
    register_set,
    start_session,
)


def _single_day_program(api, catalog):
    return create_program(
        api,
        days=[program_day("Push", [program_exercise(catalog["Supino reto com barra"]["id"])])],
    )


def test_program_of_another_user_is_not_found(api, catalog):
    program = _single_day_program(api, catalog)
    other = api.as_user(new_user_id())

    for method in ("GET", "DELETE"):
        body = expect(other.request(method, f"/api/v1/programs/{program['id']}"), 404)
        assert body["code"] == "NOT_FOUND"

    body = expect(
        other.put(f"/api/v1/programs/{program['id']}", json=program_payload(name="Stolen")), 404
    )
    assert body["code"] == "NOT_FOUND"

    # The owner still sees the untouched program.
    owner_view = expect(api.get(f"/api/v1/programs/{program['id']}"), 200)
    assert owner_view["name"] == program["name"]
    assert owner_view["days"][0]["exercises"][0]["exerciseId"] == program["days"][0]["exercises"][0]["exerciseId"]


def test_another_user_cannot_start_a_session_from_a_foreign_day(api, catalog):
    program = _single_day_program(api, catalog)
    other = api.as_user(new_user_id())

    body = expect(
        other.post(
            "/api/v1/workout-sessions",
            json={"programId": program["id"], "programDayId": program["days"][0]["id"]},
        ),
        404,
    )
    assert body["code"] == "NOT_FOUND"

    # Starting with only the foreign program identifier is also reported as not found.
    body = expect(other.post("/api/v1/workout-sessions", json={"programId": program["id"]}), 404)
    assert body["code"] == "NOT_FOUND"

    assert expect(other.get("/api/v1/workout-sessions"), 200)["content"] == []


def test_session_and_sets_of_another_user_are_not_found(api, catalog):
    session = start_session(api)
    supino = catalog["Supino reto com barra"]["id"]
    entry = add_exercise(api, session["id"], supino)
    registered = expect(
        register_set(api, session["id"], entry["id"], weight=60.0, repetitions=10), 201
    )

    other = api.as_user(new_user_id())

    assert expect(other.get(f"/api/v1/workout-sessions/{session['id']}"), 404)["code"] == "NOT_FOUND"
    assert (
        expect(
            other.patch(
                f"/api/v1/workout-sessions/{session['id']}",
                json={"status": "PAUSED"},
            ),
            404,
        )["code"]
        == "NOT_FOUND"
    )
    assert (
        expect(other.post(f"/api/v1/workout-sessions/{session['id']}/complete"), 404)["code"]
        == "NOT_FOUND"
    )
    assert (
        expect(
            other.post(
                f"/api/v1/workout-sessions/{session['id']}/sets",
                json={"sessionExerciseId": entry["id"], "weightKg": 80.0, "repetitions": 5},
            ),
            404,
        )["code"]
        == "NOT_FOUND"
    )
    assert (
        expect(
            other.patch(f"/api/v1/sets/{registered['id']}", json={"repetitions": 4}), 404
        )["code"]
        == "NOT_FOUND"
    )
    assert expect(other.request("DELETE", f"/api/v1/sets/{registered['id']}"), 404)["code"] == "NOT_FOUND"

    # The owner keeps the session and the set intact.
    owner_view = expect(api.get(f"/api/v1/workout-sessions/{session['id']}"), 200)
    assert owner_view["exercises"][0]["sets"][0]["repetitions"] == 10


def test_records_analytics_and_restrictions_are_isolated(api, catalog):
    completed_session_with_set(api, catalog["Supino reto com barra"]["id"], weight=100.0, repetitions=5)
    expect(
        api.put(
            "/api/v1/restrictions",
            json={"restrictions": [{"bodyRegion": "Ombro", "description": "Evitar overhead"}]},
        ),
        200,
    )

    other = api.as_user(new_user_id())
    assert expect(other.get("/api/v1/records"), 200)["content"] == []
    assert expect(other.get("/api/v1/restrictions"), 200) == []

    overview = expect(other.get("/api/v1/analytics/overview"), 200)
    assert overview["summary"]["completedSessions"] == 0
    assert decimal_of(overview["summary"]["totalVolumeKg"]) == decimal_of(0)
    assert overview["recentSessions"] == []
    assert overview.get("lastSessionAt") is None


def test_personal_exercise_of_another_user_cannot_be_used(api, catalog):
    personal = expect(
        api.post(
            "/api/v1/exercises",
            json={
                "name": "Remada pessoal da suite",
                "primaryMuscleGroup": "Costas",
                "equipment": "Halteres",
                "movementType": "ISOLATION",
            },
        ),
        201,
    )

    other = api.as_user(new_user_id())
    session = start_session(other)
    body = expect(
        other.post(
            f"/api/v1/workout-sessions/{session['id']}/exercises",
            json={"exerciseId": personal["id"]},
        ),
        422,
    )
    assert body["code"] == "VALIDATION_ERROR"
    assert body["fieldErrors"][0]["field"] == "exerciseId"

    proposal = expect(
        other.post(
            "/api/v1/programs",
            json=program_payload(
                days=[program_day("Costas", [program_exercise(personal["id"])])]
            ),
        ),
        422,
    )
    assert proposal["fieldErrors"][0]["field"] == "days[0].exercises[0].exerciseId"


def test_ids_are_never_read_from_the_body(api, catalog):
    """The owner of a created resource is always the identity of the header."""
    foreign = str(uuid.uuid4())
    created = expect(
        api.post(
            "/api/v1/programs",
            json={
                **program_payload(name="Owned by the header"),
                "userId": foreign,
                "id": foreign,
            },
        ),
        201,
    )
    assert created["id"] != foreign

    other = api.as_user(foreign)
    assert expect(other.get(f"/api/v1/programs/{created['id']}"), 404)["code"] == "NOT_FOUND"
    assert expect(api.get(f"/api/v1/programs/{created['id']}"), 200)["name"] == "Owned by the header"
