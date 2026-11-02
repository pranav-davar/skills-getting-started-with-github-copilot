from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture
def client(monkeypatch):
    test_activities = deepcopy(app_module.activities)
    monkeypatch.setattr(app_module, "activities", test_activities)

    with TestClient(app_module.app) as test_client:
        yield test_client


def test_root_redirects_to_frontend(client):
    # Arrange
    expected_location = "/static/index.html"

    # Act
    response = client.get("/", follow_redirects=False)

    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == expected_location


def test_get_activities_returns_activity_data(client):
    # Arrange
    expected_participants = ["michael@mergington.edu", "daniel@mergington.edu"]

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    activities = response.json()
    assert "Chess Club" in activities
    assert activities["Chess Club"]["participants"] == expected_participants


def test_signup_adds_participant(client):
    # Arrange
    email = "new.student@mergington.edu"

    # Act
    response = client.post("/activities/Art Club/signup", params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for Art Club"}
    participants = client.get("/activities").json()["Art Club"]["participants"]
    assert email in participants


def test_signup_rejects_duplicate_participant(client):
    # Arrange
    email = "new.student@mergington.edu"
    client.post("/activities/Art Club/signup", params={"email": email})

    # Act
    response = client.post("/activities/Art Club/signup", params={"email": email})

    # Assert
    assert response.status_code == 400
    participants = client.get("/activities").json()["Art Club"]["participants"]
    assert participants.count(email) == 1


def test_signup_returns_not_found_for_unknown_activity(client):
    # Arrange
    activity = "Unknown Club"
    email = "new.student@mergington.edu"

    # Act
    response = client.post(
        f"/activities/{activity}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_removes_only_selected_participant(client):
    # Arrange
    email = "michael@mergington.edu"

    # Act
    response = client.delete("/activities/Chess Club/signup", params={"email": email})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": f"Unregistered {email} from Chess Club"}
    participants = client.get("/activities").json()["Chess Club"]["participants"]
    assert participants == ["daniel@mergington.edu"]


def test_unregister_returns_not_found_for_unknown_activity(client):
    # Arrange
    activity = "Unknown Club"
    email = "new.student@mergington.edu"

    # Act
    response = client.delete(
        f"/activities/{activity}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_returns_not_found_for_unregistered_participant(client):
    # Arrange
    email = "not.registered@mergington.edu"
    original_participants = client.get("/activities").json()["Chess Club"]["participants"]

    # Act
    response = client.delete("/activities/Chess Club/signup", params={"email": email})

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"
    participants = client.get("/activities").json()["Chess Club"]["participants"]
    assert participants == original_participants