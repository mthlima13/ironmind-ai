"""Health, identity header contract, public catalog and absence of auth endpoints."""

import pytest
import requests

from support import BASE_URL, catalog_id, expect


def test_health_is_public_and_names_the_service():
    body = expect(requests.get(f"{BASE_URL}/api/v1/health", timeout=20), 200)
    assert body["status"] == "UP"
    assert body["service"] == "ironmind-backend"
    assert body["timestamp"]


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/api/v1/programs"),
        ("GET", "/api/v1/workout-sessions"),
        ("GET", "/api/v1/records"),
        ("GET", "/api/v1/restrictions"),
        ("GET", "/api/v1/analytics/overview"),
        ("POST", "/api/v1/exercises"),
    ],
)
def test_private_route_without_header_is_anonymous(api, method, path):
    response = api.request(method, path, as_user=None, json={} if method == "POST" else None)
    body = expect(response, 401)
    assert body["code"] == "UNAUTHENTICATED"
    assert body["status"] == 401
    assert body["path"] == path
    assert body["traceId"]
    assert response.headers.get("X-Trace-Id") == body["traceId"]


@pytest.mark.parametrize(
    "raw",
    [
        "not-a-uuid",
        "123",
        "00000000-0000-0000-0000-000000000000",
        "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee,11111111-2222-3333-4444-555555555555",
    ],
)
def test_malformed_identity_header_is_anonymous(api, raw):
    body = expect(api.get("/api/v1/programs", as_user=raw), 401)
    assert body["code"] == "UNAUTHENTICATED"


def test_unknown_identity_gets_an_empty_account(api):
    assert expect(api.get("/api/v1/programs"), 200)["content"] == []
    assert expect(api.get("/api/v1/workout-sessions"), 200)["content"] == []
    assert expect(api.get("/api/v1/records"), 200)["content"] == []
    assert expect(api.get("/api/v1/restrictions"), 200) == []


def test_catalog_is_public_seeded_and_deterministic(catalog):
    assert len(catalog) >= 50

    anonymous = expect(
        requests.get(f"{BASE_URL}/api/v1/exercises",
                     params={"page": 0, "size": 100, "search": "Supino reto com barra"},
                     timeout=20),
        200,
    )
    assert anonymous["totalElements"] >= 1
    supino = next(item for item in anonymous["content"] if item["name"] == "Supino reto com barra")
    assert supino["isSystem"] is True
    # A null owner of a system exercise is omitted by the serializer.
    assert supino.get("createdByUserId") is None
    assert supino["movementType"] in {"COMPOUND", "ISOLATION", "CARDIO"}
    # The seeder derives the identifier from the name, so a fresh database always
    # gets the same identifier for the same catalog.
    assert supino["id"] == catalog_id("Supino reto com barra")
    assert catalog["Supino reto com barra"]["id"] == supino["id"]


def test_catalog_filters_by_muscle_group_equipment_and_search(catalog):
    body = expect(api_get_exercises({"muscleGroup": "Peito", "size": 100}), 200)
    assert body["content"]
    assert all(item["primaryMuscleGroup"].lower() == "peito" for item in body["content"])

    body = expect(api_get_exercises({"equipment": "Barra", "size": 100}), 200)
    assert body["content"]
    assert all(item["equipment"].lower() == "barra" for item in body["content"])

    body = expect(api_get_exercises({"search": "supino", "size": 100}), 200)
    names = [item["name"].lower() for item in body["content"]]
    assert names and all("supino" in name for name in names)


def test_personal_exercise_is_private(api, catalog):
    payload = {
        "name": "Supino inventado pela suite",
        "description": "Movimento pessoal",
        "primaryMuscleGroup": "Peito",
        "secondaryMuscleGroups": ["Triceps"],
        "equipment": "Halteres",
        "instructions": "Execucao de teste",
        "movementType": "ISOLATION",
    }
    created = expect(api.post("/api/v1/exercises", json=payload), 201)
    assert created["isSystem"] is False
    assert created["createdByUserId"] == api.user_id

    mine = expect(api.get("/api/v1/exercises", params={"onlyMine": "true"}), 200)
    assert [item["id"] for item in mine["content"]] == [created["id"]]

    owner_view = expect(api.get(f"/api/v1/exercises/{created['id']}"), 200)
    assert owner_view["name"] == payload["name"]

    other = api.as_user(None)
    body = expect(other.get(f"/api/v1/exercises/{created['id']}"), 404)
    assert body["code"] == "NOT_FOUND"

    # The personal exercise never leaks into the anonymous catalog.
    anonymous = expect(api_get_exercises({"search": payload["name"]}), 200)
    assert anonymous["content"] == []


def test_anonymous_cannot_list_personal_exercises(api):
    body = expect(api.get("/api/v1/exercises", params={"onlyMine": "true"}, as_user=None), 401)
    assert body["code"] == "UNAUTHENTICATED"


def test_service_exposes_no_authentication_or_profile_endpoints(api):
    assert api.post("/api/v1/auth/login", json={"email": "a@b.c", "password": "secret"}).status_code == 404
    assert api.post("/api/v1/auth/register", json={}).status_code == 404
    assert api.get("/api/v1/users/me").status_code == 404
    assert api.patch("/api/v1/users/me", json={}).status_code == 404
    assert api.delete("/api/v1/users/me").status_code == 404


def test_page_envelope_and_pagination_limits(api):
    body = expect(api.get("/api/v1/programs", params={"page": 0, "size": 5}), 200)
    assert set(body) == {"content", "page", "size", "totalElements", "totalPages", "hasNext"}
    assert body["page"] == 0
    assert body["size"] == 5
    assert expect(api.get("/api/v1/programs", params={"size": 101}), 422)["code"] == "VALIDATION_ERROR"


def test_volume_is_not_accepted_from_the_client():
    """A sanity check that the API never exposes an endpoint that stores calculated metrics."""
    # There is no resource for the user to write volume, one repetition maximum or records.
    response = requests.post(f"{BASE_URL}/api/v1/records", json={"value": 100}, timeout=20)
    assert response.status_code in {401, 404, 405}


def api_get_exercises(params: dict):
    return requests.get(f"{BASE_URL}/api/v1/exercises", params=params, timeout=20)
