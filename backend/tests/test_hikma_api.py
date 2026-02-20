"""HikmabyLM Backend API Tests"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture
def auth_token(client):
    """Register a test user and return JWT token"""
    resp = client.post(f"{BASE_URL}/api/auth/register", json={
        "email": "TEST_tester@hikma.com",
        "password": "password123",
        "name": "TEST User"
    })
    if resp.status_code == 400 and "déjà" in resp.text:
        resp = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_tester@hikma.com",
            "password": "password123"
        })
    assert resp.status_code == 200
    return resp.json()["token"]

# --- Auth Tests ---
class TestAuth:
    def test_register_new_user(self, client):
        import uuid
        email = f"TEST_{uuid.uuid4().hex[:8]}@hikma.com"
        resp = client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email, "password": "password123", "name": "TEST New"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == email

    def test_login_success(self, client, auth_token):
        resp = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_tester@hikma.com", "password": "password123"
        })
        assert resp.status_code == 200
        assert "token" in resp.json()

    def test_login_wrong_password(self, client):
        resp = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "TEST_tester@hikma.com", "password": "wrongpass"
        })
        assert resp.status_code == 401

    def test_me_authenticated(self, client, auth_token):
        resp = client.get(f"{BASE_URL}/api/auth/me",
                          headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        assert "user_id" in resp.json()

# --- Home ---
class TestHome:
    def test_home_returns_correct_structure(self, client):
        resp = client.get(f"{BASE_URL}/api/home")
        assert resp.status_code == 200
        data = resp.json()
        assert "hero" in data
        assert "recommendations" in data
        assert "featured_scholar" in data
        assert "daily_pick" in data

    def test_home_recommendations_non_empty(self, client):
        resp = client.get(f"{BASE_URL}/api/home")
        data = resp.json()
        assert len(data["recommendations"]) > 0

# --- Courses ---
class TestCourses:
    def test_get_courses_returns_8(self, client):
        resp = client.get(f"{BASE_URL}/api/courses")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 8

    def test_get_single_course(self, client):
        resp = client.get(f"{BASE_URL}/api/courses/crs-001")
        assert resp.status_code == 200
        assert resp.json()["id"] == "crs-001"

    def test_course_not_found(self, client):
        resp = client.get(f"{BASE_URL}/api/courses/nonexistent")
        assert resp.status_code == 404

# --- Scholars ---
class TestScholars:
    def test_get_scholars_returns_5(self, client):
        resp = client.get(f"{BASE_URL}/api/scholars")
        assert resp.status_code == 200
        assert len(resp.json()) == 5

    def test_get_single_scholar(self, client):
        resp = client.get(f"{BASE_URL}/api/scholars/sch-001")
        assert resp.status_code == 200
        assert resp.json()["id"] == "sch-001"

# --- Audios ---
class TestAudios:
    def test_get_audios(self, client):
        resp = client.get(f"{BASE_URL}/api/audios")
        assert resp.status_code == 200
        assert len(resp.json()) > 0

    def test_audio_stream_url_aud001(self, client):
        resp = client.get(f"{BASE_URL}/api/audios/aud-001/stream-url")
        assert resp.status_code == 200
        data = resp.json()
        assert "stream_url" in data
        assert "source" in data
        # Source should be r2 or fallback
        assert data["source"] in ("r2", "fallback")

# --- Live Sessions ---
class TestLiveSessions:
    def test_get_live_sessions_returns_5(self, client):
        resp = client.get(f"{BASE_URL}/api/live-sessions")
        assert resp.status_code == 200
        assert len(resp.json()) == 5

# --- R2 Files ---
class TestR2:
    def test_list_r2_files(self, client):
        resp = client.get(f"{BASE_URL}/api/r2/files")
        # May return 503 if R2 not configured or 200 with files
        assert resp.status_code in (200, 503)
        if resp.status_code == 200:
            data = resp.json()
            assert "files" in data
            assert "count" in data
