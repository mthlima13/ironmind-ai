"""AI endpoints: deterministic mock provider, validation, decisions and rate limit."""

import uuid

from support import (
    completed_session_with_set,
    create_program,
    decimal_of,
    expect,
    idempotency,
    new_user_id,
    program_day,
    program_exercise,
)

SUPINO = "Supino reto com barra"
MODEL = "mock-ironmind-v1"
GENERAL_DISCLAIMER = (
    "Resposta informativa gerada por IA; não substitui a avaliação de um profissional de "
    "saúde ou de educação física."
)


def _propose(api, **overrides) -> dict:
    payload = {"prompt": "Quero um treino de forca para tres dias", **overrides}
    return expect(api.post("/api/v1/ai/workout-proposals", json=payload), 200)


def test_proposes_a_validated_program_without_saving_it(api, catalog):
    proposal = _propose(api, trainingDays=3, goal="STRENGTH", splitType="FULL_BODY")

    assert proposal["recommendationId"]
    assert proposal["status"] == "PENDING"
    assert proposal["model"] == MODEL
    assert proposal["goal"] == "STRENGTH"
    assert proposal["splitType"] == "FULL_BODY"
    assert proposal["name"]
    assert proposal["explanation"]
    assert proposal["disclaimer"]
    # No profile is stored by the service, so the proposal warns about the missing equipment.
    assert any("Equipamento" in warning for warning in proposal["warnings"])

    assert len(proposal["days"]) == 3
    catalog_ids = {exercise["id"] for exercise in catalog.values()}
    for day in proposal["days"]:
        assert day["name"]
        assert 1 <= len(day["exercises"]) <= 5
        for exercise in day["exercises"]:
            assert exercise["exerciseId"] in catalog_ids
            assert exercise["name"]
            assert 1 <= exercise["sets"] <= 8
            assert 1 <= exercise["repsMin"] <= exercise["repsMax"] <= 30
            assert 0 <= exercise["restSeconds"] <= 600

    # Nothing was persisted as a program.
    assert expect(api.get("/api/v1/programs"), 200)["totalElements"] == 0


def test_proposal_honours_the_requested_number_of_days(api):
    proposal = _propose(api, trainingDays=4, goal="ENDURANCE", splitType="UPPER_LOWER")
    assert proposal["goal"] == "ENDURANCE"
    assert proposal["splitType"] == "UPPER_LOWER"
    assert len(proposal["days"]) == 4


def test_rejects_an_empty_prompt_or_out_of_range_days(api):
    assert expect(api.post("/api/v1/ai/workout-proposals", json={"prompt": "  "}), 422)[
        "fieldErrors"
    ][0]["field"] == "prompt"
    assert expect(
        api.post("/api/v1/ai/workout-proposals", json={"prompt": "Treino", "trainingDays": 8}), 422
    )["fieldErrors"][0]["field"] == "trainingDays"


def test_proposal_is_idempotent(api):
    payload = {"prompt": "Monte um treino", "trainingDays": 2}
    key = str(uuid.uuid4())

    first = expect(api.post("/api/v1/ai/workout-proposals", json=payload, headers=idempotency(key)), 200)
    replay = expect(api.post("/api/v1/ai/workout-proposals", json=payload, headers=idempotency(key)), 200)
    assert replay["recommendationId"] == first["recommendationId"]

    reused = expect(
        api.post(
            "/api/v1/ai/workout-proposals",
            json={"prompt": "Outro treino", "trainingDays": 2},
            headers=idempotency(key),
        ),
        409,
    )
    assert reused["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_records_the_decision_about_a_proposal(api, catalog):
    proposal = _propose(api, trainingDays=2)
    decision = expect(
        api.post(
            f"/api/v1/ai/recommendations/{proposal['recommendationId']}/decision",
            json={"status": "REJECTED"},
        ),
        200,
    )
    assert decision["id"] == proposal["recommendationId"]
    assert decision["status"] == "REJECTED"
    assert decision.get("acceptedAt") is None
    assert decision.get("savedProgramId") is None

    again = expect(
        api.post(
            f"/api/v1/ai/recommendations/{proposal['recommendationId']}/decision",
            json={"status": "ACCEPTED"},
        ),
        409,
    )
    assert again["code"] == "CONFLICT"


def test_links_the_program_saved_from_a_proposal(api, catalog):
    proposal = _propose(api, trainingDays=2)
    program = create_program(
        api,
        name="Salvo da proposta",
        days=[program_day("Dia", [program_exercise(catalog[SUPINO]["id"])])],
    )

    decision = expect(
        api.post(
            f"/api/v1/ai/recommendations/{proposal['recommendationId']}/decision",
            json={"status": "ACCEPTED", "programId": program["id"]},
        ),
        200,
    )
    assert decision["status"] == "ACCEPTED"
    assert decision["savedProgramId"] == program["id"]
    assert decision["acceptedAt"]


def test_decision_rejects_invalid_status_and_foreign_program(api, catalog):
    proposal = _propose(api, trainingDays=2)

    pending = expect(
        api.post(
            f"/api/v1/ai/recommendations/{proposal['recommendationId']}/decision",
            json={"status": "PENDING"},
        ),
        422,
    )
    assert pending["fieldErrors"][0]["field"] == "status"

    foreign_program = expect(
        api.post(
            f"/api/v1/ai/recommendations/{proposal['recommendationId']}/decision",
            json={"status": "ACCEPTED", "programId": str(uuid.uuid4())},
        ),
        404,
    )
    assert foreign_program["code"] == "NOT_FOUND"


def test_another_user_cannot_review_the_recommendation(api):
    proposal = _propose(api, trainingDays=2)
    other = api.as_user(new_user_id())

    body = expect(
        other.post(
            f"/api/v1/ai/recommendations/{proposal['recommendationId']}/decision",
            json={"status": "ACCEPTED"},
        ),
        404,
    )
    assert body["code"] == "NOT_FOUND"


def test_load_suggestion_without_history(api, catalog):
    suggestion = expect(
        api.post("/api/v1/ai/load-suggestions", json={"exerciseId": catalog[SUPINO]["id"]}),
        200,
    )
    assert suggestion["rule"] == "INSUFFICIENT_HISTORY"
    assert suggestion["sets"] == []
    assert suggestion["sessionsConsidered"] == 0
    assert suggestion["exerciseName"] == SUPINO
    assert suggestion["applied"] is False
    assert suggestion["disclaimer"]
    assert suggestion["recommendationId"]


def test_load_suggestion_mirrors_the_last_session_without_enough_history(api, catalog):
    exercise_id = catalog[SUPINO]["id"]
    completed_session_with_set(api, exercise_id, weight=100.0, repetitions=10, perceived_exertion=8)

    suggestion = expect(api.post("/api/v1/ai/load-suggestions", json={"exerciseId": exercise_id}), 200)
    assert suggestion["rule"] == "KEEP_LAST_LOAD"
    assert suggestion["confidence"] == "LOW"
    assert suggestion["sessionsConsidered"] == 1
    assert suggestion["lastPerformedAt"]
    assert len(suggestion["sets"]) == 1
    assert decimal_of(suggestion["sets"][0]["weightKg"]) == decimal_of(100)
    assert suggestion["sets"][0]["repetitions"] == 10
    assert suggestion["applied"] is False


def test_load_suggestion_reduces_the_load_after_a_maximal_effort(api, catalog):
    exercise_id = catalog[SUPINO]["id"]
    completed_session_with_set(api, exercise_id, weight=100.0, repetitions=5, perceived_exertion=10)

    suggestion = expect(api.post("/api/v1/ai/load-suggestions", json={"exerciseId": exercise_id}), 200)
    assert suggestion["rule"] == "REDUCE_LOAD"
    # Loads above 20 kg move in steps of 2.5 kg.
    assert decimal_of(suggestion["sets"][0]["weightKg"]) == decimal_of(97.5)


def test_load_suggestion_increases_the_load_after_three_controlled_sessions(api, catalog):
    exercise_id = catalog[SUPINO]["id"]
    for _ in range(3):
        completed_session_with_set(api, exercise_id, weight=100.0, repetitions=12, perceived_exertion=8)

    suggestion = expect(api.post("/api/v1/ai/load-suggestions", json={"exerciseId": exercise_id}), 200)
    assert suggestion["rule"] == "INCREASE_LOAD"
    assert suggestion["confidence"] == "HIGH"
    assert suggestion["sessionsConsidered"] == 3
    assert decimal_of(suggestion["sets"][0]["weightKg"]) == decimal_of(102.5)
    assert suggestion["sets"][0]["repetitions"] == 8


def test_load_suggestion_is_idempotent(api, catalog):
    payload = {"exerciseId": catalog[SUPINO]["id"]}
    key = str(uuid.uuid4())

    first = expect(api.post("/api/v1/ai/load-suggestions", json=payload, headers=idempotency(key)), 200)
    replay = expect(api.post("/api/v1/ai/load-suggestions", json=payload, headers=idempotency(key)), 200)
    assert replay["recommendationId"] == first["recommendationId"]

    reused = expect(
        api.post(
            "/api/v1/ai/load-suggestions",
            json={**payload, "targetRepsMin": 5, "targetRepsMax": 8},
            headers=idempotency(key),
        ),
        409,
    )
    assert reused["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_load_suggestion_validates_range_and_exercise(api, catalog):
    invalid = expect(
        api.post(
            "/api/v1/ai/load-suggestions",
            json={"exerciseId": catalog[SUPINO]["id"], "targetRepsMin": 12, "targetRepsMax": 8},
        ),
        422,
    )
    assert invalid["fieldErrors"][0]["field"] == "targetRepsMax"

    unknown = expect(
        api.post("/api/v1/ai/load-suggestions", json={"exerciseId": str(uuid.uuid4())}), 404
    )
    assert unknown["code"] == "NOT_FOUND"


def test_coach_answers_with_the_safety_notices(api):
    body = expect(api.post("/api/v1/ai/coach", json={"message": "Como progredir no supino?"}), 200)
    assert body["reply"]
    assert body["model"] == MODEL
    assert body["disclaimers"][0] == GENERAL_DISCLAIMER

    pain = expect(
        api.post("/api/v1/ai/coach", json={"message": "Sinto dor no ombro quando supino"}), 200
    )
    assert len(pain["disclaimers"]) == 2
    assert "dor" in pain["disclaimers"][1].lower()


def test_voice_interpretation_pre_fills_the_set_form(api):
    body = expect(
        api.post(
            "/api/v1/ai/voice-interpretation",
            json={"transcript": "80 kg 10 reps; 100 kg 5 reps"},
        ),
        200,
    )
    assert body["model"] == MODEL
    assert body["disclaimer"]
    assert body["notes"]
    assert len(body["sets"]) == 2
    assert [item["setNumber"] for item in body["sets"]] == [1, 2]
    assert decimal_of(body["sets"][0]["weightKg"]) == decimal_of(80)
    assert body["sets"][0]["repetitions"] == 10
    assert decimal_of(body["sets"][1]["weightKg"]) == decimal_of(100)
    assert body["sets"][1]["repetitions"] == 5


def test_voice_interpretation_rejects_an_unreadable_transcription(api):
    body = expect(api.post("/api/v1/ai/voice-interpretation", json={"transcript": "bom dia"}), 502)
    assert body["code"] == "AI_INVALID_RESPONSE"

    assert expect(
        api.post("/api/v1/ai/voice-interpretation", json={"transcript": "  "}), 422
    )["code"] == "VALIDATION_ERROR"


def test_ai_endpoints_are_rate_limited_per_user(api):
    for _ in range(10):
        expect(api.post("/api/v1/ai/coach", json={"message": "Dica de treino"}), 200)

    response = api.post("/api/v1/ai/coach", json={"message": "Dica de treino"})
    body = expect(response, 429)
    assert body["code"] == "RATE_LIMITED"
    assert int(response.headers["Retry-After"]) > 0


def test_ai_endpoints_require_the_identity_header(api):
    body = expect(
        api.post("/api/v1/ai/coach", json={"message": "Oi"}, as_user=None), 401
    )
    assert body["code"] == "UNAUTHENTICATED"
