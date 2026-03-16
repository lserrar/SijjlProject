"""
Test Admin Catalogue Tree View APIs for Sijill Project
This tests the admin panel catalogue endpoints: cursus, courses, audios, scholars, sync-preview, sync-all-r2
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sijill-updates.preview.emergentagent.com').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "loubna.serrar@gmail.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    if response.status_code != 200:
        pytest.fail(f"Admin login failed: {response.status_code} - {response.text}")
    
    data = response.json()
    assert "token" in data, "Token not in login response"
    assert data.get("user", {}).get("role") == "admin", "User is not admin"
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Get authorization headers with admin token."""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestAdminCatalogue:
    """Tests for Admin Catalogue Tree View APIs"""
    
    def test_admin_login(self, admin_token):
        """Test admin can successfully login."""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"SUCCESS: Admin login successful, token obtained")
    
    def test_admin_cursus_list(self, auth_headers):
        """Test GET /api/admin/cursus returns cursus list."""
        response = requests.get(f"{BASE_URL}/api/admin/cursus", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        cursus_list = response.json()
        assert isinstance(cursus_list, list), "Response should be a list"
        assert len(cursus_list) >= 5, f"Expected at least 5 cursus, got {len(cursus_list)}"
        
        # Verify structure of cursus
        for cursus in cursus_list:
            assert "id" in cursus, "Cursus should have id"
            assert "name" in cursus, "Cursus should have name"
            assert "is_active" in cursus, "Cursus should have is_active"
            
        # Check expected cursus (A-E)
        cursus_names = [c["name"] for c in cursus_list]
        expected_cursus = ["La Falsafa", "Théologie", "Sciences islamiques", "Arts", "spiritualités"]
        found_count = sum(1 for c in cursus_names for e in expected_cursus if e.lower() in c.lower())
        assert found_count >= 5, f"Expected 5 main cursus, found {found_count}"
        
        print(f"SUCCESS: Found {len(cursus_list)} cursus")
    
    def test_admin_courses_list(self, auth_headers):
        """Test GET /api/admin/courses returns courses list."""
        response = requests.get(f"{BASE_URL}/api/admin/courses", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        courses = response.json()
        assert isinstance(courses, list), "Response should be a list"
        assert len(courses) >= 24, f"Expected at least 24 courses, got {len(courses)}"
        
        # Verify structure of courses
        for course in courses:
            assert "id" in course, "Course should have id"
            assert "title" in course, "Course should have title"
            assert "cursus_id" in course or "thematique_id" in course, "Course should link to cursus"
            
        print(f"SUCCESS: Found {len(courses)} courses")
    
    def test_admin_audios_list(self, auth_headers):
        """Test GET /api/admin/audios returns audios (episodes) list."""
        response = requests.get(f"{BASE_URL}/api/admin/audios", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        audios = response.json()
        assert isinstance(audios, list), "Response should be a list"
        assert len(audios) >= 70, f"Expected at least 70 episodes, got {len(audios)}"
        
        # Verify structure of audios
        synced_count = 0
        for audio in audios:
            assert "id" in audio, "Audio should have id"
            assert "title" in audio, "Audio should have title"
            if audio.get("file_key"):
                synced_count += 1
                
        print(f"SUCCESS: Found {len(audios)} episodes, {synced_count} synchronized")
    
    def test_admin_scholars_list(self, auth_headers):
        """Test GET /api/admin/scholars returns scholars list."""
        response = requests.get(f"{BASE_URL}/api/admin/scholars", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        scholars = response.json()
        assert isinstance(scholars, list), "Response should be a list"
        
        # Verify structure of scholars
        for scholar in scholars:
            assert "id" in scholar, "Scholar should have id"
            assert "name" in scholar, "Scholar should have name"
            
        print(f"SUCCESS: Found {len(scholars)} scholars")
    
    def test_sync_preview_endpoint(self, auth_headers):
        """Test POST /api/admin/sync-preview returns preview of sync changes."""
        response = requests.post(f"{BASE_URL}/api/admin/sync-preview", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "to_create" in data, "Response should have to_create list"
        assert "to_update" in data, "Response should have to_update list"
        assert "to_delete" in data, "Response should have to_delete list"
        
        assert isinstance(data["to_create"], list), "to_create should be a list"
        assert isinstance(data["to_update"], list), "to_update should be a list"
        assert isinstance(data["to_delete"], list), "to_delete should be a list"
        
        print(f"SUCCESS: Sync preview - Create: {len(data['to_create'])}, Update: {len(data['to_update'])}, Delete: {len(data['to_delete'])}")
    
    def test_admin_panel_audios_page_loads(self, admin_token):
        """Test GET /api/admin-panel/audios returns HTML page."""
        # Note: This is a Jinja2 HTML page, not an API endpoint
        # The page itself loads but requires JS to render tree
        response = requests.get(
            f"{BASE_URL}/api/admin-panel/audios",
            headers={"Cookie": f"session_token={admin_token}"}
        )
        # The page should return 200 or redirect to login
        assert response.status_code in [200, 302], f"Expected 200 or 302, got {response.status_code}"
        
        if response.status_code == 200:
            # Check for expected HTML elements
            content = response.text
            assert "Catalogue" in content or "audios_new" in content or "tree" in content.lower(), \
                "Page should contain catalogue-related content"
            print("SUCCESS: Admin panel audios page loads correctly")
        else:
            print("INFO: Page redirects to login (expected behavior without valid session)")


class TestAdminAudioCRUD:
    """Tests for Admin Audio CRUD operations"""
    
    test_audio_id = None
    
    def test_update_audio(self, auth_headers):
        """Test PUT /api/admin/audios/{audio_id} updates audio metadata."""
        # First get an existing audio
        response = requests.get(f"{BASE_URL}/api/admin/audios", headers=auth_headers)
        assert response.status_code == 200
        
        audios = response.json()
        assert len(audios) > 0, "Need at least one audio to test update"
        
        test_audio = audios[0]
        audio_id = test_audio["id"]
        original_title = test_audio.get("title", "")
        
        # Update with a test modification (append TEST_ prefix)
        new_title = f"TEST_{original_title}" if not original_title.startswith("TEST_") else original_title
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/audios/{audio_id}",
            headers=auth_headers,
            json={"title": new_title}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_audio = update_response.json()
        assert updated_audio["title"] == new_title, "Title should be updated"
        
        # Revert the change
        revert_response = requests.put(
            f"{BASE_URL}/api/admin/audios/{audio_id}",
            headers=auth_headers,
            json={"title": original_title}
        )
        assert revert_response.status_code == 200, "Revert should succeed"
        
        print(f"SUCCESS: Audio update and revert working for {audio_id}")


class TestDashboardRegression:
    """Regression tests for admin dashboard"""
    
    def test_dashboard_page_accessible(self, admin_token):
        """Test GET /api/admin-panel/ dashboard still works."""
        response = requests.get(
            f"{BASE_URL}/api/admin-panel/",
            headers={"Cookie": f"session_token={admin_token}"}
        )
        assert response.status_code in [200, 302], f"Dashboard should be accessible, got {response.status_code}"
        print("SUCCESS: Dashboard page accessible")
    
    def test_auth_me_endpoint(self, auth_headers):
        """Test /api/auth/me returns current user."""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200, f"Auth me failed: {response.status_code}"
        
        user = response.json()
        assert user.get("role") == "admin", "User should be admin"
        assert user.get("email") == ADMIN_EMAIL, "Email should match"
        print("SUCCESS: Auth/me returns admin user correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
