"""Programs: creation, replacement, archiving, validation and idempotency."""

import uuid

from support import (
    create_program,
    expect,
    idempotency,
    program_day,
    program_exercise,
    program_payload,
)


def test_creates_program_with_days_and_exercises_in_order(api, catalog):
    supino = catalog["Supino reto com barra"]["id"]
    remada = catalog["Remada curvada"]["id"]

    days = [
        program_day(
            "Push",
            [
                program_exercise(supino, sets=4, reps_min=6, reps_max=8, rest=150,
                                 notes="Controlar a descida"),
                program_exercise(remada, sets=3, reps_min=8, reps_max=12, rest=120),
            ],
        ),
        program_day("Pull", [program_exercise(remada, sets=4, reps_min=10, reps_max=12)]),
    ]

    response = api.post("/api/v1/programs", json=program_payload(days=days))
    program = expect(response, 201)

    assert response.headers["Location"] == f"/api/v1/programs/{program['id']}"
    assert program["name"] == "Push / Pull / Legs"
    assert program["goal"] == "HYPERTROPHY"
    assert program["splitType"] == "PPL"
    assert program["isArchived"] is False
    assert program["createdAt"]

    assert [day["name"] for day in program["days"]] == ["Push", "Pull"]
    assert [day["position"] for day in program["days"]] == [1, 2]
    assert all(day["programId"] == program["id"] for day in program["days"])

    push = program["days"][0]
    assert [exercise["position"] for exercise in push["exercises"]] == [1, 2]
    assert [exercise["exerciseId"] for exercise in push["exercises"]] == [supino, remada]
    assert push["exercises"][0]["targetSets"] == 4
    assert push["exercises"][0]["targetRepsMin"] == 6
    assert push["exercises"][0]["targetRepsMax"] == 8
    assert push["exercises"][0]["restSeconds"] == 150
    assert push["exercises"][0]["notes"] == "Controlar a descida"
    # The catalog entry travels embedded, so the client does not need a second call.
    assert push["exercises"][1]["exercise"]["id"] == remada
    assert push["exercises"][1]["exercise"]["name"] == "Remada curvada"

    # The listing and the read by identifier agree with the answer of the creation.
    listed = expect(api.get("/api/v1/programs"), 200)
    assert listed["totalElements"] == 1
    assert listed["content"][0]["id"] == program["id"]

    fetched = expect(api.get(f"/api/v1/programs/{program['id']}"), 200)
    assert fetched["days"] == program["days"]


def test_update_replaces_the_whole_structure(api, catalog):
    program = create_program(
        api,
        days=[
            program_day("Push", [program_exercise(catalog["Supino reto com barra"]["id"])]),
            program_day("Pull", [program_exercise(catalog["Remada curvada"]["id"])]),
        ],
    )

    replacement = program_payload(
        name="Full body",
        goal="STRENGTH",
        split_type="FULL_BODY",
        days=[
            program_day(
                "Corpo inteiro",
                [
                    program_exercise(catalog["Leg press 45 graus"]["id"], sets=5, reps_min=5,
                                     reps_max=5, rest=180),
                    program_exercise(catalog["Prancha"]["id"], sets=3, reps_min=30,
                                     reps_max=60, rest=60),
                ],
            )
        ],
    )
    updated = expect(api.put(f"/api/v1/programs/{program['id']}", json=replacement), 200)

    assert updated["name"] == "Full body"
    assert updated["goal"] == "STRENGTH"
    assert updated["splitType"] == "FULL_BODY"
    assert len(updated["days"]) == 1
    assert [exercise["position"] for exercise in updated["days"][0]["exercises"]] == [1, 2]
    assert updated["days"][0]["exercises"][1]["exerciseId"] == catalog["Prancha"]["id"]

    fetched = expect(api.get(f"/api/v1/programs/{program['id']}"), 200)
    assert fetched["days"] == updated["days"]


def test_archive_removes_the_program_from_the_default_listing(api, catalog):
    program = create_program(api)

    response = api.delete(f"/api/v1/programs/{program['id']}")
    assert response.status_code == 204
    assert response.content == b""

    assert expect(api.get("/api/v1/programs"), 200)["content"] == []
    archived = expect(api.get("/api/v1/programs", params={"includeArchived": "true"}), 200)
    assert archived["content"][0]["id"] == program["id"]
    assert archived["content"][0]["isArchived"] is True

    # Archiving is not deletion: the program stays reachable by its identifier.
    fetched = expect(api.get(f"/api/v1/programs/{program['id']}"), 200)
    assert fetched["isArchived"] is True


def test_rejects_a_repetition_range_that_ends_before_it_starts(api, catalog):
    body = expect(
        api.post(
            "/api/v1/programs",
            json=program_payload(
                days=[
                    program_day(
                        "Push",
                        [program_exercise(catalog["Supino reto com barra"]["id"],
                                          reps_min=12, reps_max=8)],
                    )
                ]
            ),
        ),
        422,
    )
    assert body["code"] == "VALIDATION_ERROR"
    assert body["fieldErrors"][0]["field"] == "days[0].exercises[0].targetRepsMax"


def test_rejects_an_exercise_outside_the_catalog(api, catalog):
    body = expect(
        api.post(
            "/api/v1/programs",
            json=program_payload(
                days=[
                    program_day(
                        "Push",
                        [
                            program_exercise(catalog["Supino reto com barra"]["id"]),
                            program_exercise(str(uuid.uuid4())),
                        ],
                    )
                ]
            ),
        ),
        422,
    )
    assert body["code"] == "VALIDATION_ERROR"
    assert body["fieldErrors"][0]["field"] == "days[0].exercises[1].exerciseId"


def test_rejects_an_empty_name(api):
    body = expect(api.post("/api/v1/programs", json=program_payload(name="   ")), 422)
    assert body["code"] == "VALIDATION_ERROR"
    assert body["fieldErrors"][0]["field"] == "name"


def test_idempotency_key_replays_the_same_program(api, catalog):
    payload = program_payload(
        days=[program_day("Push", [program_exercise(catalog["Supino reto com barra"]["id"])])]
    )
    key = str(uuid.uuid4())

    first = expect(api.post("/api/v1/programs", json=payload, headers=idempotency(key)), 201)
    replay = expect(api.post("/api/v1/programs", json=payload, headers=idempotency(key)), 200)

    assert replay["id"] == first["id"]
    assert expect(api.get("/api/v1/programs"), 200)["totalElements"] == 1


def test_idempotency_key_reused_with_another_body_is_a_conflict(api):
    key = str(uuid.uuid4())
    expect(api.post("/api/v1/programs", json=program_payload(name="Primeiro"),
                    headers=idempotency(key)), 201)

    body = expect(
        api.post("/api/v1/programs", json=program_payload(name="Segundo"), headers=idempotency(key)),
        409,
    )
    assert body["code"] == "IDEMPOTENCY_KEY_REUSED"
