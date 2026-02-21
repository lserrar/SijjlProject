"""
Test cases for Professeurs/Cursus renaming and Course-Cursus linking features.
Testing:
1. Professors (formerly Savants) API endpoints
2. Cursus (formerly Thematiques) API endpoints  
3. Course creation/update with thematique_id field
4. Admin panel pages accessibility
"""

import pytest
import requests
import os
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://hikma-staging.preview.emergentagent.com"

# Admin credentials
ADMIN_EMAIL = "admin@hikma-admin.com"
ADMIN_PASSWORD = "Admin123!"


class TestAuthSetup:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestProfesseursAPI(TestAuthSetup):
    """Test Professors (formerly Savants/Scholars) API endpoints"""
    
    def test_get_professors_list(self, auth_headers):
        """GET /api/admin/scholars - List all professors"""
        response = requests.get(
            f"{BASE_URL}/api/admin/scholars",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} professors")
        
        # Verify structure
        if len(data) > 0:
            professor = data[0]
            assert "id" in professor
            assert "name" in professor
    
    def test_create_professor(self, auth_headers):
        """POST /api/admin/scholars - Create a new professor"""
        test_name = f"TEST_Professor_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/admin/scholars",
            headers=auth_headers,
            json={
                "name": test_name,
                "university": "TEST University",
                "bio": "Test professor bio",
                "specializations": ["Test1", "Test2"]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == test_name
        
        # Cleanup
        prof_id = data["id"]
        requests.delete(f"{BASE_URL}/api/admin/scholars/{prof_id}", headers=auth_headers)
    
    def test_professors_auth_required(self):
        """Verify professors endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/scholars")
        assert response.status_code in [401, 403]


class TestCursusAPI(TestAuthSetup):
    """Test Cursus (formerly Thematiques) API endpoints"""
    
    def test_get_cursus_list(self, auth_headers):
        """GET /api/admin/thematiques - List all cursus"""
        response = requests.get(
            f"{BASE_URL}/api/admin/thematiques",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} cursus items")
        
        # Verify structure
        if len(data) > 0:
            cursus = data[0]
            assert "id" in cursus
            assert "name" in cursus
    
    def test_get_public_thematiques(self):
        """GET /api/thematiques - Public endpoint for thematiques"""
        response = requests.get(f"{BASE_URL}/api/thematiques")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_cursus(self, auth_headers):
        """POST /api/admin/thematiques - Create a new cursus"""
        test_name = f"TEST_Cursus_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/admin/thematiques",
            headers=auth_headers,
            json={
                "name": test_name,
                "description": "Test cursus description",
                "order": 99
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        
        # Cleanup
        cursus_id = data["id"]
        requests.delete(f"{BASE_URL}/api/admin/thematiques/{cursus_id}", headers=auth_headers)


class TestCourseWithCursus(TestAuthSetup):
    """Test Course creation/update with thematique_id (Cursus linking)"""
    
    def test_create_course_with_thematique_id(self, auth_headers):
        """POST /api/admin/courses - Create course with thematique_id field"""
        # First get a valid thematique_id
        thematiques_response = requests.get(
            f"{BASE_URL}/api/admin/thematiques",
            headers=auth_headers
        )
        assert thematiques_response.status_code == 200
        thematiques = thematiques_response.json()
        assert len(thematiques) > 0, "Need at least one thematique/cursus for this test"
        
        thematique_id = thematiques[0]["id"]
        thematique_name = thematiques[0].get("name", "Unknown")
        
        # Create course with thematique_id
        test_title = f"TEST_Course_Cursus_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/admin/courses",
            headers=auth_headers,
            json={
                "title": test_title,
                "description": "Test course with cursus",
                "topic": "Test",
                "level": "Debutant",
                "language": "Francais",
                "scholar_id": "sch-001",
                "scholar_name": "Prof. Mohammed Al-Fassi",
                "thematique_id": thematique_id,
                "duration": 60
            }
        )
        assert response.status_code == 200, f"Course creation failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["thematique_id"] == thematique_id, "thematique_id not saved correctly"
        print(f"Created course with thematique_id={thematique_id} ({thematique_name})")
        
        course_id = data["id"]
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/courses/{course_id}")
        assert get_response.status_code == 200
        course_data = get_response.json()
        assert course_data["thematique_id"] == thematique_id
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/courses/{course_id}", headers=auth_headers)
    
    def test_update_course_thematique_id(self, auth_headers):
        """PUT /api/admin/courses/{id} - Update course thematique_id"""
        # Get thematiques
        thematiques_response = requests.get(
            f"{BASE_URL}/api/admin/thematiques",
            headers=auth_headers
        )
        thematiques = thematiques_response.json()
        assert len(thematiques) >= 2, "Need at least 2 thematiques for this test"
        
        thematique_id_1 = thematiques[0]["id"]
        thematique_id_2 = thematiques[1]["id"]
        
        # Create course with first thematique
        test_title = f"TEST_Course_Update_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/courses",
            headers=auth_headers,
            json={
                "title": test_title,
                "description": "Test course for update",
                "topic": "Test",
                "level": "Debutant",
                "language": "Francais",
                "scholar_id": "sch-001",
                "scholar_name": "Prof. Mohammed Al-Fassi",
                "thematique_id": thematique_id_1,
                "duration": 60
            }
        )
        assert create_response.status_code == 200
        course_id = create_response.json()["id"]
        
        # Update thematique_id
        update_response = requests.put(
            f"{BASE_URL}/api/admin/courses/{course_id}",
            headers=auth_headers,
            json={"thematique_id": thematique_id_2}
        )
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["thematique_id"] == thematique_id_2, "thematique_id not updated"
        print(f"Updated course thematique_id from {thematique_id_1} to {thematique_id_2}")
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/courses/{course_id}")
        assert get_response.status_code == 200
        assert get_response.json()["thematique_id"] == thematique_id_2
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/courses/{course_id}", headers=auth_headers)
    
    def test_course_without_thematique_id(self, auth_headers):
        """Test creating course without thematique_id (should be optional)"""
        test_title = f"TEST_Course_NoCursus_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/admin/courses",
            headers=auth_headers,
            json={
                "title": test_title,
                "description": "Test course without cursus",
                "topic": "Test",
                "level": "Debutant",
                "language": "Francais",
                "scholar_id": "sch-001",
                "scholar_name": "Prof. Mohammed Al-Fassi",
                "duration": 60
                # No thematique_id
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        # thematique_id should be None or empty
        assert data.get("thematique_id") in [None, "", None]
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/courses/{data['id']}", headers=auth_headers)


class TestAdminPanelPages:
    """Test Admin Panel HTML pages accessibility"""
    
    def test_professors_page_accessible(self):
        """GET /api/admin-panel/professors - Page should return HTML"""
        response = requests.get(f"{BASE_URL}/api/admin-panel/professors")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        assert "Professeurs" in response.text
    
    def test_courses_page_accessible(self):
        """GET /api/admin-panel/courses - Page should return HTML"""
        response = requests.get(f"{BASE_URL}/api/admin-panel/courses")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        assert "Cours" in response.text
    
    def test_dashboard_page_accessible(self):
        """GET /api/admin-panel/ - Dashboard should return HTML"""
        response = requests.get(f"{BASE_URL}/api/admin-panel/")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        # Should have Professeurs in sidebar, not Savants
        assert "Professeurs" in response.text
        # Should have Cursus in sidebar, not Thematiques
        assert "Cursus" in response.text
    
    def test_thematiques_page_accessible(self):
        """GET /api/admin-panel/thematiques - Thematiques/Cursus page should return HTML"""
        response = requests.get(f"{BASE_URL}/api/admin-panel/thematiques")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")


class TestCourseListWithCursus(TestAuthSetup):
    """Test that courses list API includes thematique_id in response"""
    
    def test_courses_list_includes_thematique_id(self, auth_headers):
        """GET /api/admin/courses - Verify thematique_id field in response"""
        response = requests.get(
            f"{BASE_URL}/api/admin/courses",
            headers=auth_headers
        )
        assert response.status_code == 200
        courses = response.json()
        assert len(courses) > 0, "Need at least one course for this test"
        
        # Check that courses with thematique_id have the field populated
        courses_with_cursus = [c for c in courses if c.get("thematique_id")]
        print(f"Found {len(courses_with_cursus)}/{len(courses)} courses with thematique_id")
        
        # Verify at least one course has thematique_id
        assert len(courses_with_cursus) > 0, "Expected at least one course with thematique_id"
        
        # Verify thematique_id format
        sample_course = courses_with_cursus[0]
        assert isinstance(sample_course["thematique_id"], str)
        assert len(sample_course["thematique_id"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
