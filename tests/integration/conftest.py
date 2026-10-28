"""Fixtures of the integration suite.

The target instance is configured by the environment:

* ``BASE_URL``           URL of the API (default ``http://localhost:8080``);
* ``USER_UUID_HEADER``   name of the identity header (default ``X-User-UUID``);
* ``READY_TIMEOUT_SECONDS`` how long the suite waits for the API to answer.

When the suite runs through ``docker compose --profile test run --rm tests`` the
compose file sets ``BASE_URL`` to the internal address of the API.
"""

from __future__ import annotations

import os
import time

import pytest
import requests

from support import BASE_URL, Api, expect

READY_TIMEOUT_SECONDS = int(os.environ.get("READY_TIMEOUT_SECONDS", "240"))


@pytest.fixture(scope="session", autouse=True)
def api_is_ready():
    """Waits for the API to answer the public health check before the first test."""
    deadline = time.monotonic() + READY_TIMEOUT_SECONDS
    last_error = "no attempt was made"
    while time.monotonic() < deadline:
        try:
            response = requests.get(f"{BASE_URL}/api/v1/health", timeout=5)
            if response.status_code == 200 and response.json().get("status") == "UP":
                return
            last_error = f"{response.status_code} {response.text[:200]}"
        except requests.RequestException as error:  # pragma: no cover - depends on the environment
            last_error = str(error)
        time.sleep(2)
    pytest.fail(f"The API at {BASE_URL} did not become ready: {last_error}")


@pytest.fixture
def api() -> Api:
    """Client bound to a brand new identity, so tests never share state."""
    return Api()


@pytest.fixture(scope="session")
def catalog() -> dict[str, dict]:
    """Public exercise catalog, keyed by name, in a single read."""
    exercises: dict[str, dict] = {}
    page = 0
    while True:
        body = expect(
            requests.get(f"{BASE_URL}/api/v1/exercises", params={"page": page, "size": 100},
                         timeout=30),
            200,
        )
        for exercise in body["content"]:
            exercises[exercise["name"]] = exercise
        if not body["hasNext"]:
            return exercises
        page += 1
