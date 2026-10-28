"""Injury restrictions: sensitive data that is always scoped to the owner."""

from support import expect

SUPINO = "Supino reto com barra"


def test_an_empty_account_has_no_restrictions(api):
    assert expect(api.get("/api/v1/restrictions"), 200) == []


def test_creates_and_lists_restrictions(api, catalog):
    payload = {
        "restrictions": [
            {
                "bodyRegion": "  Ombro  ",
                "description": "  Evitar movimentos acima da cabeça  ",
                "exerciseIds": [catalog[SUPINO]["id"]],
            },
            {
                "bodyRegion": "Joelho",
                "description": "Sem impacto",
                "isActive": False,
            },
        ]
    }
    created = expect(api.put("/api/v1/restrictions", json=payload), 200)

    assert len(created) == 2
    assert created[0]["bodyRegion"] == "Ombro"
    assert created[0]["description"] == "Evitar movimentos acima da cabeça"
    assert created[0]["isActive"] is True
    assert created[0]["exerciseIds"] == [catalog[SUPINO]["id"]]
    assert created[0]["id"]

    assert created[1]["bodyRegion"] == "Joelho"
    assert created[1]["isActive"] is False
    assert created[1]["exerciseIds"] == []

    listed = expect(api.get("/api/v1/restrictions"), 200)
    assert sorted(item["id"] for item in listed) == sorted(item["id"] for item in created)


def test_the_update_replaces_the_whole_set(api):
    expect(
        api.put(
            "/api/v1/restrictions",
            json={
                "restrictions": [
                    {"bodyRegion": "Ombro", "description": "Primeira"},
                    {"bodyRegion": "Joelho", "description": "Segunda"},
                ]
            },
        ),
        200,
    )

    replaced = expect(
        api.put(
            "/api/v1/restrictions",
            json={"restrictions": [{"bodyRegion": "Lombar", "description": "Apenas esta"}]},
        ),
        200,
    )
    assert len(replaced) == 1
    assert replaced[0]["bodyRegion"] == "Lombar"

    listed = expect(api.get("/api/v1/restrictions"), 200)
    assert [item["bodyRegion"] for item in listed] == ["Lombar"]

    assert expect(api.put("/api/v1/restrictions", json={"restrictions": []}), 200) == []
    assert expect(api.get("/api/v1/restrictions"), 200) == []


def test_rejects_a_restriction_without_region_or_description(api):
    body = expect(
        api.put("/api/v1/restrictions", json={"restrictions": [{"description": "Sem região"}]}), 422
    )
    assert body["code"] == "VALIDATION_ERROR"
    assert body["fieldErrors"][0]["field"] == "bodyRegion"

    body = expect(
        api.put("/api/v1/restrictions", json={"restrictions": [{"bodyRegion": "Ombro"}]}), 422
    )
    assert body["fieldErrors"][0]["field"] == "description"

    body = expect(api.put("/api/v1/restrictions", json={"restrictions": None}), 422)
    assert body["fieldErrors"][0]["field"] == "restrictions"


def test_an_active_restriction_blocks_the_load_suggestion(api, catalog):
    exercise_id = catalog[SUPINO]["id"]
    expect(
        api.put(
            "/api/v1/restrictions",
            json={
                "restrictions": [
                    {
                        "bodyRegion": "Ombro",
                        "description": "Evitar supino",
                        "exerciseIds": [exercise_id],
                    }
                ]
            },
        ),
        200,
    )

    body = expect(
        api.post("/api/v1/ai/load-suggestions", json={"exerciseId": exercise_id}), 422
    )
    assert body["code"] == "VALIDATION_ERROR"
    assert body["fieldErrors"][0]["field"] == "exerciseId"

    # Deactivating the restriction releases the exercise again.
    expect(
        api.put(
            "/api/v1/restrictions",
            json={
                "restrictions": [
                    {
                        "bodyRegion": "Ombro",
                        "description": "Evitar supino",
                        "isActive": False,
                        "exerciseIds": [exercise_id],
                    }
                ]
            },
        ),
        200,
    )
    suggestion = expect(api.post("/api/v1/ai/load-suggestions", json={"exerciseId": exercise_id}), 200)
    assert suggestion["rule"] == "INSUFFICIENT_HISTORY"


def test_restrictions_are_not_returned_for_an_unknown_identity(api):
    expect(
        api.put(
            "/api/v1/restrictions",
            json={"restrictions": [{"bodyRegion": "Ombro", "description": "Minha"}]},
        ),
        200,
    )
    assert expect(api.get("/api/v1/restrictions", as_user=None), 401)["code"] == "UNAUTHENTICATED"
