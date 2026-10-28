"""Analytics: weekly dashboard and evolution of an exercise, always calculated by the server."""

import datetime as dt
import uuid

from support import (
    add_exercise,
    completed_session_with_set,
    create_program,
    decimal_of,
    expect,
    new_user_id,
    open_session_with_exercise,
    program_day,
    program_exercise,
    register_set,
    start_session,
)

SUPINO = "Supino reto com barra"


def test_an_empty_account_has_an_empty_dashboard(api):
    overview = expect(api.get("/api/v1/analytics/overview"), 200)

    summary = overview["summary"]
    assert decimal_of(summary["totalVolumeKg"]) == decimal_of(0)
    assert summary["completedSessions"] == 0
    assert summary["recordsBroken"] == 0
    assert summary["totalSets"] == 0
    assert summary["averageSessionMinutes"] == 0
    assert decimal_of(overview["volumeChangePercent"]) == decimal_of(0)
    assert overview["activity"] == []
    assert overview["recentSessions"] == []
    assert overview.get("lastSessionAt") is None


def test_an_open_session_does_not_count(api, catalog):
    session, entry = open_session_with_exercise(api, catalog[SUPINO]["id"])
    expect(register_set(api, session["id"], entry["id"], weight=100.0, repetitions=5), 201)

    overview = expect(api.get("/api/v1/analytics/overview"), 200)
    assert overview["summary"]["completedSessions"] == 0
    assert decimal_of(overview["summary"]["totalVolumeKg"]) == decimal_of(0)
    assert overview["recentSessions"] == []


def test_a_completed_session_feeds_the_week(api, catalog):
    session = completed_session_with_set(api, catalog[SUPINO]["id"], weight=100.0, repetitions=5)

    overview = expect(api.get("/api/v1/analytics/overview"), 200)
    summary = overview["summary"]

    assert decimal_of(summary["totalVolumeKg"]) == decimal_of(500)
    assert summary["completedSessions"] == 1
    assert summary["totalSets"] == 1
    assert summary["recordsBroken"] == 3
    assert summary["averageSessionMinutes"] >= 0

    # The previous week has no volume, so the change is reported as zero.
    assert decimal_of(overview["volumeChangePercent"]) == decimal_of(0)
    assert overview["lastSessionAt"] == session["completedAt"]

    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    assert len(overview["activity"]) == 1
    point = overview["activity"][0]
    assert point["date"] == today
    assert decimal_of(point["volumeKg"]) == decimal_of(500)
    assert point["completedSessions"] == 1

    assert len(overview["recentSessions"]) == 1
    recent = overview["recentSessions"][0]
    assert recent["id"] == session["id"]
    assert recent["completedAt"] == session["completedAt"]
    assert decimal_of(recent["volumeKg"]) == decimal_of(500)
    assert recent["totalSets"] == 1
    assert recent.get("programName") is None


def test_the_recent_session_names_the_program(api, catalog):
    program = create_program(
        api,
        name="Push do dashboard",
        days=[program_day("Push", [program_exercise(catalog[SUPINO]["id"])])],
    )
    session = start_session(api, program_id=program["id"], day_id=program["days"][0]["id"])
    entry = session["exercises"][0]
    expect(register_set(api, session["id"], entry["id"], weight=100.0, repetitions=5), 201)
    expect(api.post(f"/api/v1/workout-sessions/{session['id']}/complete"), 200)

    overview = expect(api.get("/api/v1/analytics/overview"), 200)
    assert overview["recentSessions"][0]["programName"] == "Push do dashboard"


def test_exercise_progress_groups_the_sets_by_day(api, catalog):
    exercise_id = catalog[SUPINO]["id"]
    session, entry = open_session_with_exercise(api, exercise_id)
    expect(register_set(api, session["id"], entry["id"], weight=100.0, repetitions=5), 201)
    expect(register_set(api, session["id"], entry["id"], weight=80.0, repetitions=10), 201)
    expect(api.post(f"/api/v1/workout-sessions/{session['id']}/complete"), 200)

    progress = expect(api.get(f"/api/v1/analytics/exercises/{exercise_id}"), 200)
    assert progress["exercise"]["id"] == exercise_id
    assert progress["exercise"]["name"] == SUPINO

    assert len(progress["points"]) == 1
    point = progress["points"][0]
    assert point["date"] == dt.datetime.now(dt.timezone.utc).date().isoformat()
    assert point["sets"] == 2
    assert decimal_of(point["bestWeightKg"]) == decimal_of(100)
    assert decimal_of(point["estimatedOneRepMaxKg"]) == decimal_of("112.50")
    assert decimal_of(point["totalVolumeKg"]) == decimal_of(1300)


def test_exercise_progress_without_history_is_empty(api, catalog):
    progress = expect(api.get(f"/api/v1/analytics/exercises/{catalog[SUPINO]['id']}"), 200)
    assert progress["points"] == []


def test_exercise_progress_of_bodyweight_is_zero_volume(api, catalog):
    exercise_id = catalog["Prancha"]["id"]
    session, entry = open_session_with_exercise(api, exercise_id)
    expect(register_set(api, session["id"], entry["id"], weight=None, repetitions=30), 201)
    expect(api.post(f"/api/v1/workout-sessions/{session['id']}/complete"), 200)

    point = expect(api.get(f"/api/v1/analytics/exercises/{exercise_id}"), 200)["points"][0]
    assert point["sets"] == 1
    assert decimal_of(point["totalVolumeKg"]) == decimal_of(0)
    assert point.get("bestWeightKg") is None
    assert point.get("estimatedOneRepMaxKg") is None


def test_exercise_progress_rejects_unknown_or_foreign_exercise(api):
    assert expect(api.get(f"/api/v1/analytics/exercises/{uuid.uuid4()}"), 404)["code"] == "NOT_FOUND"

    personal = expect(
        api.post(
            "/api/v1/exercises",
            json={
                "name": "Exercicio privado do progresso",
                "primaryMuscleGroup": "Peito",
                "equipment": "Barra",
                "movementType": "ISOLATION",
            },
        ),
        201,
    )
    other = api.as_user(new_user_id())
    assert expect(other.get(f"/api/v1/analytics/exercises/{personal['id']}"), 404)["code"] == "NOT_FOUND"
    assert expect(api.get(f"/api/v1/analytics/exercises/{personal['id']}"), 200)["points"] == []


def test_a_session_with_two_exercises_sums_the_volume(api, catalog):
    session = start_session(api)
    supino = add_exercise(api, session["id"], catalog[SUPINO]["id"])
    remada = add_exercise(api, session["id"], catalog["Remada curvada"]["id"])

    expect(register_set(api, session["id"], supino["id"], weight=100.0, repetitions=5), 201)
    expect(register_set(api, session["id"], remada["id"], weight=60.0, repetitions=10), 201)
    expect(api.post(f"/api/v1/workout-sessions/{session['id']}/complete"), 200)

    summary = expect(api.get("/api/v1/analytics/overview"), 200)["summary"]
    assert decimal_of(summary["totalVolumeKg"]) == decimal_of(500 + 600)
    assert summary["totalSets"] == 2
