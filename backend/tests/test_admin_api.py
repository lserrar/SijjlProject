"""HikmabyLM Admin Panel API Tests
Tests for admin authentication and CRUD operations on scholars, courses, audios, users
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Admin credentials from review request
ADMIN_EMAIL = "admin@hikma-admin.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture
def client():
    """Basic HTTP client session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def admin_token(client):
    """Login as admin and return JWT token"""
    resp = client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    data = resp.json()
    assert "token" in data, "No token in login response"
    assert data.get("user", {}).get("role") == "admin", "User is not admin"
    return data["token"]


@pytest.fixture
def admin_client(client, admin_token):
    """HTTP client with admin authorization header"""
    client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return client


# ============================================================================
# Health Check
# ============================================================================
class TestHealth:
    def test_health_endpoint(self, client):
        """API /api/health - doit retourner status healthy"""
        resp = client.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "healthy"
        assert "service" in data


# ============================================================================
# Admin Authentication
# ============================================================================
class TestAdminAuth:
    def test_admin_login_success(self, client):
        """API /api/auth/login - connexion admin avec credentials valides"""
        resp = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"

    def test_admin_login_wrong_password(self, client):
        """Admin login with wrong password fails"""
        resp = client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert resp.status_code == 401


# ============================================================================
# Admin Scholars CRUD
# ============================================================================
class TestAdminScholars:
    def test_list_scholars(self, admin_client):
        """API /api/admin/scholars - liste des savants (requiert token admin)"""
        resp = admin_client.get(f"{BASE_URL}/api/admin/scholars")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 5  # Seeded scholars

    def test_list_scholars_without_auth(self, client):
        """Admin scholars list requires auth"""
        resp = client.get(f"{BASE_URL}/api/admin/scholars")
        assert resp.status_code in [401, 403]

    def test_create_scholar(self, admin_client):
        """API POST /api/admin/scholars - création savant"""
        test_id = f"test-sch-{uuid.uuid4().hex[:8]}"
        resp = admin_client.post(f"{BASE_URL}/api/admin/scholars", json={
            "name": f"TEST Scholar {test_id}",
            "university": "TEST University",
            "bio": "TEST Bio description",
            "photo": "https://example.com/photo.jpg",
            "specializations": ["Test1", "Test2"]
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert data["name"].startswith("TEST Scholar")
        
        # Verify creation via GET
        scholar_id = data["id"]
        get_resp = admin_client.get(f"{BASE_URL}/api/admin/scholars")
        scholars = get_resp.json()
        created = next((s for s in scholars if s["id"] == scholar_id), None)
        assert created is not None, "Created scholar not found in list"
        return scholar_id

    def test_update_scholar(self, admin_client):
        """API PUT /api/admin/scholars/{id} - modification savant"""
        # First create a scholar
        test_id = f"test-sch-{uuid.uuid4().hex[:8]}"
        create_resp = admin_client.post(f"{BASE_URL}/api/admin/scholars", json={
            "name": f"TEST Scholar Update {test_id}",
            "university": "Original University",
            "bio": "Original bio",
            "specializations": []
        })
        assert create_resp.status_code == 200
        scholar_id = create_resp.json()["id"]

        # Update the scholar
        update_resp = admin_client.put(f"{BASE_URL}/api/admin/scholars/{scholar_id}", json={
            "university": "Updated University",
            "bio": "Updated bio"
        })
        assert update_resp.status_code == 200
        
        # Verify update
        get_resp = admin_client.get(f"{BASE_URL}/api/admin/scholars")
        scholars = get_resp.json()
        updated = next((s for s in scholars if s["id"] == scholar_id), None)
        assert updated is not None
        assert updated["university"] == "Updated University"

    def test_toggle_scholar_status(self, admin_client):
        """API PATCH /api/admin/scholars/{id}/toggle - toggle statut actif"""
        # Get first scholar
        resp = admin_client.get(f"{BASE_URL}/api/admin/scholars")
        scholars = resp.json()
        assert len(scholars) > 0
        scholar_id = scholars[0]["id"]
        original_status = scholars[0].get("is_active", True)

        # Toggle status
        toggle_resp = admin_client.patch(f"{BASE_URL}/api/admin/scholars/{scholar_id}/toggle")
        assert toggle_resp.status_code == 200
        data = toggle_resp.json()
        assert data.get("is_active") != original_status

        # Toggle back
        toggle_back = admin_client.patch(f"{BASE_URL}/api/admin/scholars/{scholar_id}/toggle")
        assert toggle_back.status_code == 200

    def test_delete_scholar(self, admin_client):
        """API DELETE /api/admin/scholars/{id} - suppression savant"""
        # Create a scholar to delete
        create_resp = admin_client.post(f"{BASE_URL}/api/admin/scholars", json={
            "name": "TEST Scholar To Delete",
            "university": "Delete University",
            "bio": "To be deleted",
            "specializations": []
        })
        assert create_resp.status_code == 200
        scholar_id = create_resp.json()["id"]

        # Delete it
        del_resp = admin_client.delete(f"{BASE_URL}/api/admin/scholars/{scholar_id}")
        assert del_resp.status_code == 200

        # Verify deletion
        get_resp = admin_client.get(f"{BASE_URL}/api/admin/scholars")
        scholars = get_resp.json()
        deleted = next((s for s in scholars if s["id"] == scholar_id), None)
        assert deleted is None, "Scholar was not deleted"


# ============================================================================
# Admin Courses CRUD
# ============================================================================
class TestAdminCourses:
    def test_list_courses(self, admin_client):
        """API /api/admin/courses - liste des cours (requiert token admin)"""
        resp = admin_client.get(f"{BASE_URL}/api/admin/courses")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 8  # Seeded courses

    def test_list_courses_without_auth(self, client):
        """Admin courses list requires auth"""
        resp = client.get(f"{BASE_URL}/api/admin/courses")
        assert resp.status_code in [401, 403]


# ============================================================================
# Admin Audios CRUD
# ============================================================================
class TestAdminAudios:
    def test_list_audios(self, admin_client):
        """API /api/admin/audios - liste des audios (requiert token admin)"""
        resp = admin_client.get(f"{BASE_URL}/api/admin/audios")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 12  # Seeded audios

    def test_list_audios_without_auth(self, client):
        """Admin audios list requires auth"""
        resp = client.get(f"{BASE_URL}/api/admin/audios")
        assert resp.status_code in [401, 403]


# ============================================================================
# Admin Users Management
# ============================================================================
class TestAdminUsers:
    def test_list_users(self, admin_client):
        """API /api/admin/users - liste des utilisateurs (requiert token admin)"""
        resp = admin_client.get(f"{BASE_URL}/api/admin/users")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least admin user

    def test_list_users_without_auth(self, client):
        """Admin users list requires auth"""
        resp = client.get(f"{BASE_URL}/api/admin/users")
        assert resp.status_code in [401, 403]

    def test_grant_free_access(self, admin_client, client):
        """Test granting free access to a user"""
        # First create a test user
        test_email = f"TEST_freeaccess_{uuid.uuid4().hex[:8]}@test.com"
        reg_resp = client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test Free Access User"
        })
        assert reg_resp.status_code == 200
        user_id = reg_resp.json()["user"]["user_id"]

        # Grant free access
        grant_resp = admin_client.post(f"{BASE_URL}/api/admin/users/{user_id}/grant-access")
        assert grant_resp.status_code == 200
        data = grant_resp.json()
        assert data.get("has_premium_access") == True


# ============================================================================
# Admin Stats
# ============================================================================
class TestAdminStats:
    def test_admin_stats(self, admin_client):
        """Admin stats endpoint returns correct structure"""
        resp = admin_client.get(f"{BASE_URL}/api/admin/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "scholars_count" in data
        assert "courses_count" in data
        assert "audios_count" in data
        assert "users_count" in data
