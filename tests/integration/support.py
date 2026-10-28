"""Client and helpers shared by the integration tests.

The suite only talks to the public REST API of a running instance: it never
imports the backend code and never touches the MongoDB directly. That keeps the
tests honest about the contract described in `docs/API.md`.

Every call carries the identity header configured by the gateway, so each test
chooses the owner of the data it creates.
"""

from __future__ import annotations

import os
import uuid
from decimal import Decimal

import requests

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8080").rstrip("/")
USER_HEADER = os.environ.get("USER_UUID_HEADER", "X-User-UUID")

#: Sentinel that tells the client to use the identity it was created with.
USE_DEFAULT_IDENTITY = object()


class Api:
    """Minimal client of the API bound to one user identity."""

    def __init__(self, user_id: str | None = None, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.user_id = user_id or new_user_id()
        self.http = requests.Session()
        self.http.headers["Accept"] = "application/json"

    def request(self, method: str, path: str, *, as_user=USE_DEFAULT_IDENTITY, headers=None, **kwargs):
        """Sends one request, optionally changing (or omitting) the identity header."""
        merged = dict(headers or {})
        identity = self.user_id if as_user is USE_DEFAULT_IDENTITY else as_user
        if identity is not None:
            merged[USER_HEADER] = identity
        return self.http.request(
            method, f"{self.base_url}{path}", headers=merged, timeout=60, **kwargs
        )

    def get(self, path: str, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path: str, **kwargs):
        return self.request("POST", path, **kwargs)

    def put(self, path: str, **kwargs):
        return self.request("PUT", path, **kwargs)

    def patch(self, path: str, **kwargs):
        return self.request("PATCH", path, **kwargs)

    def delete(self, path: str, **kwargs):
        return self.request("DELETE", path, **kwargs)

    def as_user(self, user_id: str | None) -> "Api":
        """Returns a client for another identity, sharing the same base URL."""
        return Api(user_id, self.base_url)


def new_user_id() -> str:
    return str(uuid.uuid4())


def expect(response: requests.Response, status: int):
    """Asserts the status code and returns the decoded JSON body, when any."""
    assert response.status_code == status, (
        f"{response.request.method} {response.request.path_url} expected {status}, "
        f"received {response.status_code}: {response.text}"
    )
    if not response.content:
        return None
    return response.json()


def decimal_of(value) -> Decimal:
    """Converts a JSON number into a Decimal, comparing the value and not the float noise."""
    return Decimal(str(value))


def catalog_id(name: str) -> str:
    """Replicates `UUID.nameUUIDFromBytes("ironmind:catalog:" + name)` used by the seeder."""
    import hashlib

    digest = bytearray(hashlib.md5(f"ironmind:catalog:{name}".encode("utf-8")).digest())
    digest[6] = (digest[6] & 0x0F) | 0x30
    digest[8] = (digest[8] & 0x3F) | 0x80
    return str(uuid.UUID(bytes=bytes(digest)))


def idempotency(key: str | None) -> dict:
    return {"Idempotency-Key": key} if key else {}


# ---------------------------------------------------------------------------
# Payload builders
# ---------------------------------------------------------------------------

def program_exercise(exercise_id: str, *, sets: int = 3, reps_min: int = 8, reps_max: int = 12,
                     rest: int = 90, notes: str | None = None) -> dict:
    return {
        "exerciseId": str(exercise_id),
        "targetSets": sets,
        "targetRepsMin": reps_min,
        "targetRepsMax": reps_max,
        "restSeconds": rest,
        "notes": notes,
    }


def program_day(name: str, exercises: list[dict]) -> dict:
    return {"name": name, "exercises": exercises}


def program_payload(*, name: str = "Push / Pull / Legs", days: list[dict] | None = None,
                    goal: str = "HYPERTROPHY", split_type: str = "PPL") -> dict:
    return {
        "name": name,
        "description": "Program created by the integration suite",
        "goal": goal,
        "splitType": split_type,
        "days": days if days is not None else [],
    }


# ---------------------------------------------------------------------------
# Workflows shared by more than one test module
# ---------------------------------------------------------------------------

def create_program(api: Api, *, days: list[dict] | None = None, name: str = "Push / Pull / Legs",
                   idempotency_key: str | None = None) -> dict:
    """Creates a program and returns the representation answered by the API."""
    return expect(
        api.post("/api/v1/programs", json=program_payload(name=name, days=days),
                 headers=idempotency(idempotency_key)),
        201,
    )


def start_session(api: Api, *, program_id: str | None = None, day_id: str | None = None,
                  idempotency_key: str | None = None) -> dict:
    payload = {}
    if program_id:
        payload["programId"] = str(program_id)
    if day_id:
        payload["programDayId"] = str(day_id)
    return expect(
        api.post("/api/v1/workout-sessions", json=payload, headers=idempotency(idempotency_key)),
        201,
    )


def add_exercise(api: Api, session_id: str, exercise_id: str, *, position: int | None = None,
                 notes: str | None = None, idempotency_key: str | None = None) -> dict:
    payload = {"exerciseId": str(exercise_id)}
    if position is not None:
        payload["position"] = position
    if notes is not None:
        payload["notes"] = notes
    return expect(
        api.post(f"/api/v1/workout-sessions/{session_id}/exercises", json=payload,
                 headers=idempotency(idempotency_key)),
        201,
    )


def register_set(api: Api, session_id: str, session_exercise_id: str, *, weight=80.0,
                 repetitions: int = 10, perceived_exertion: int | None = None,
                 rest_after_seconds: int | None = None, idempotency_key: str | None = None):
    payload = {
        "sessionExerciseId": str(session_exercise_id),
        "weightKg": weight,
        "repetitions": repetitions,
    }
    if perceived_exertion is not None:
        payload["perceivedExertion"] = perceived_exertion
    if rest_after_seconds is not None:
        payload["restAfterSeconds"] = rest_after_seconds
    return api.post(f"/api/v1/workout-sessions/{session_id}/sets", json=payload,
                    headers=idempotency(idempotency_key))


def open_session_with_exercise(api: Api, exercise_id: str) -> tuple[dict, dict]:
    """Starts a free session and adds one exercise to it."""
    session = start_session(api)
    entry = add_exercise(api, session["id"], exercise_id)
    return session, entry


def completed_session_with_set(api: Api, exercise_id: str, *, weight=80.0, repetitions: int = 10,
                               perceived_exertion: int | None = None) -> dict:
    """Starts a session, registers one set and completes the session."""
    session, entry = open_session_with_exercise(api, exercise_id)
    expect(register_set(api, session["id"], entry["id"], weight=weight, repetitions=repetitions,
                        perceived_exertion=perceived_exertion), 201)
    return expect(api.post(f"/api/v1/workout-sessions/{session['id']}/complete"), 200)
