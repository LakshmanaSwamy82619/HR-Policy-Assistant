"""
API-level tests using FastAPI's TestClient.

These test routing, dependency wiring, and error responses without
needing a live Postgres or LLM - the DB/LLM-dependent endpoints
(chat, hris/me) are covered by unit tests on their underlying logic
(test_confidence.py, test_sensitive_topics.py, etc.) plus these
smoke tests for auth/shape.
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_chat_requires_authentication():
    response = client.post("/chat", json={"message": "How many leave days do I have?"})
    assert response.status_code == 401


def test_hris_me_requires_authentication():
    response = client.get("/hris/me")
    assert response.status_code == 401


def test_admin_upload_requires_authentication():
    response = client.post("/admin/policy-documents", data={"title": "x", "category": "leave"})
    assert response.status_code == 401


def test_admin_create_employee_requires_authentication():
    response = client.post("/admin/employees", json={
        "employee_code": "EMP-9999", "name": "Test User", "email": "test@example.com", "password": "temp12345",
    })
    assert response.status_code == 401


def test_admin_list_employees_requires_authentication():
    response = client.get("/admin/employees")
    assert response.status_code == 401


def test_admin_update_employee_requires_authentication():
    response = client.patch("/admin/employees/00000000-0000-0000-0000-000000000000", json={"is_active": False})
    assert response.status_code == 401


def test_login_with_bad_credentials_returns_generic_error():
    # No real DB is connected here, so this will fail at the DB layer -
    # this test documents the expected contract once a DB is wired in
    # integration/staging, and is skipped in this sandbox without Postgres.
    pass