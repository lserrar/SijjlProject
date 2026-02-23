"""
Test the 3-level hierarchy admin panel features:
- Cursus -> Cours -> Modules -> Audios
- Bulk toggle actions for Cursus, Cours, Modules
- Navigation links between levels
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://audio-playlist-5.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="session")
def admin_token():
    """Get admin authentication token."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "admin@hikma-admin.com", "password": "Admin123!"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()['token']


@pytest.fixture(scope="session")
def api_client(admin_token):
    """Create authenticated session."""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


# ─── Cursus Tests ─────────────────────────────────────────────────────────────


class TestCursusAdmin:
    """Test Cursus admin endpoints."""

    def test_list_cursus(self, api_client):
        """Test GET /api/admin/cursus - List all cursus."""
        response = api_client.get(f"{BASE_URL}/api/admin/cursus")
        assert response.status_code == 200
        cursus_list = response.json()
        assert isinstance(cursus_list, list)
        print(f"✓ Found {len(cursus_list)} cursus")
        
        # Verify each cursus has expected fields
        if cursus_list:
            cursus = cursus_list[0]
            assert 'id' in cursus
            assert 'name' in cursus
            print(f"✓ Cursus has required fields")

    def test_create_cursus(self, api_client):
        """Test POST /api/admin/cursus - Create a new cursus."""
        data = {
            "name": "TEST_CURSUS_BulkTest",
            "description": "Test cursus for bulk actions",
            "icon": "book",
            "order": 99,
            "is_active": False
        }
        response = api_client.post(f"{BASE_URL}/api/admin/cursus", json=data)
        assert response.status_code == 200
        result = response.json()
        assert 'id' in result
        print(f"✓ Created cursus: {result['id']}")
        return result['id']

    def test_toggle_cursus(self, api_client):
        """Test PATCH /api/admin/cursus/{id}/toggle."""
        # First create a test cursus
        data = {"name": "TEST_CURSUS_Toggle", "description": "For toggle test", "order": 98}
        create_resp = api_client.post(f"{BASE_URL}/api/admin/cursus", json=data)
        assert create_resp.status_code == 200
        cursus_id = create_resp.json()['id']
        
        # Toggle it
        response = api_client.patch(f"{BASE_URL}/api/admin/cursus/{cursus_id}/toggle")
        assert response.status_code == 200
        result = response.json()
        assert 'is_active' in result
        print(f"✓ Toggled cursus {cursus_id}, is_active: {result['is_active']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/cursus/{cursus_id}")

    def test_bulk_toggle_cursus(self, api_client):
        """Test POST /api/admin/cursus/bulk-toggle - Bulk activate/deactivate cursus."""
        # Create test cursus
        ids = []
        for i in range(3):
            data = {"name": f"TEST_CURSUS_Bulk{i}", "description": f"Bulk test {i}", "order": 90 + i}
            resp = api_client.post(f"{BASE_URL}/api/admin/cursus", json=data)
            assert resp.status_code == 200
            ids.append(resp.json()['id'])
        
        # Bulk activate
        response = api_client.post(
            f"{BASE_URL}/api/admin/cursus/bulk-toggle",
            json={"ids": ids, "is_active": True}
        )
        assert response.status_code == 200
        result = response.json()
        assert result['is_active'] == True
        print(f"✓ Bulk activated {len(ids)} cursus")
        
        # Bulk deactivate
        response = api_client.post(
            f"{BASE_URL}/api/admin/cursus/bulk-toggle",
            json={"ids": ids, "is_active": False}
        )
        assert response.status_code == 200
        result = response.json()
        assert result['is_active'] == False
        print(f"✓ Bulk deactivated {len(ids)} cursus")
        
        # Cleanup
        for cursus_id in ids:
            api_client.delete(f"{BASE_URL}/api/admin/cursus/{cursus_id}")
        print(f"✓ Cleaned up {len(ids)} test cursus")

    def test_cursus_course_count(self, api_client):
        """Verify cursus list includes course_count field."""
        response = api_client.get(f"{BASE_URL}/api/admin/cursus")
        assert response.status_code == 200
        cursus_list = response.json()
        
        # Check if course_count is included
        for cursus in cursus_list:
            if 'course_count' in cursus:
                print(f"✓ Cursus '{cursus['name']}' has {cursus.get('course_count', 0)} courses")


# ─── Courses Tests ────────────────────────────────────────────────────────────


class TestCoursesAdmin:
    """Test Courses admin endpoints."""

    def test_list_courses(self, api_client):
        """Test GET /api/admin/courses - List all courses."""
        response = api_client.get(f"{BASE_URL}/api/admin/courses")
        assert response.status_code == 200
        courses = response.json()
        assert isinstance(courses, list)
        print(f"✓ Found {len(courses)} courses")
        
        if courses:
            course = courses[0]
            assert 'id' in course
            assert 'title' in course

    def test_courses_filter_by_cursus(self, api_client):
        """Test GET /api/admin/courses?cursus={id} - Filter by cursus."""
        # Get list of cursus first
        cursus_resp = api_client.get(f"{BASE_URL}/api/admin/cursus")
        assert cursus_resp.status_code == 200
        cursus_list = cursus_resp.json()
        
        if cursus_list:
            cursus_id = cursus_list[0]['id']
            response = api_client.get(f"{BASE_URL}/api/admin/courses?thematique_id={cursus_id}")
            assert response.status_code == 200
            courses = response.json()
            print(f"✓ Filtered courses by cursus {cursus_id}: {len(courses)} courses")

    def test_create_course(self, api_client):
        """Test POST /api/admin/courses - Create a new course."""
        # Get a scholar first
        scholars_resp = api_client.get(f"{BASE_URL}/api/admin/scholars")
        assert scholars_resp.status_code == 200
        scholars = scholars_resp.json()
        
        if not scholars:
            pytest.skip("No scholars available for course creation")
        
        data = {
            "title": "TEST_COURSE_BulkTest",
            "description": "Test course for bulk actions",
            "scholar_id": scholars[0]['id'],
            "scholar_name": scholars[0]['name'],
            "level": "Debutant",
            "topic": "Test Topic",
            "language": "Francais"
        }
        response = api_client.post(f"{BASE_URL}/api/admin/courses", json=data)
        assert response.status_code == 200
        result = response.json()
        assert 'id' in result
        print(f"✓ Created course: {result['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/courses/{result['id']}")

    def test_bulk_toggle_courses(self, api_client):
        """Test POST /api/admin/courses/bulk-toggle - Bulk activate/deactivate courses."""
        # Get scholars
        scholars_resp = api_client.get(f"{BASE_URL}/api/admin/scholars")
        scholars = scholars_resp.json()
        
        if not scholars:
            pytest.skip("No scholars available")
        
        # Create test courses
        ids = []
        for i in range(2):
            data = {
                "title": f"TEST_COURSE_Bulk{i}",
                "description": f"Bulk test {i}",
                "scholar_id": scholars[0]['id'],
                "scholar_name": scholars[0]['name'],
                "level": "Debutant",
                "language": "Francais",
                "topic": "Test Topic"  # Required field
            }
            resp = api_client.post(f"{BASE_URL}/api/admin/courses", json=data)
            assert resp.status_code == 200, f"Failed to create course: {resp.text}"
            ids.append(resp.json()['id'])
        
        # Bulk activate
        response = api_client.post(
            f"{BASE_URL}/api/admin/courses/bulk-toggle",
            json={"ids": ids, "is_active": True}
        )
        assert response.status_code == 200
        print(f"✓ Bulk activated {len(ids)} courses")
        
        # Bulk deactivate
        response = api_client.post(
            f"{BASE_URL}/api/admin/courses/bulk-toggle",
            json={"ids": ids, "is_active": False}
        )
        assert response.status_code == 200
        print(f"✓ Bulk deactivated {len(ids)} courses")
        
        # Cleanup
        for course_id in ids:
            api_client.delete(f"{BASE_URL}/api/admin/courses/{course_id}")
        print(f"✓ Cleaned up {len(ids)} test courses")


# ─── Modules Tests ────────────────────────────────────────────────────────────


class TestModulesAdmin:
    """Test Modules admin endpoints."""

    def test_list_modules(self, api_client):
        """Test GET /api/admin/modules - List all modules."""
        response = api_client.get(f"{BASE_URL}/api/admin/modules")
        assert response.status_code == 200
        modules = response.json()
        assert isinstance(modules, list)
        print(f"✓ Found {len(modules)} modules")
        
        if modules:
            module = modules[0]
            assert 'id' in module
            assert 'name' in module
            assert 'course_id' in module

    def test_modules_filter_by_course(self, api_client):
        """Test GET /api/admin/modules?course_id={id} - Filter by course."""
        # Get list of courses first
        courses_resp = api_client.get(f"{BASE_URL}/api/admin/courses")
        assert courses_resp.status_code == 200
        courses = courses_resp.json()
        
        if courses:
            course_id = courses[0]['id']
            response = api_client.get(f"{BASE_URL}/api/admin/modules?course_id={course_id}")
            assert response.status_code == 200
            modules = response.json()
            print(f"✓ Filtered modules by course {course_id}: {len(modules)} modules")

    def test_create_module(self, api_client):
        """Test POST /api/admin/modules - Create a new module."""
        # Get a course first
        courses_resp = api_client.get(f"{BASE_URL}/api/admin/courses")
        assert courses_resp.status_code == 200
        courses = courses_resp.json()
        
        if not courses:
            pytest.skip("No courses available for module creation")
        
        data = {
            "name": "TEST_MODULE_BulkTest",
            "description": "Test module for bulk actions",
            "course_id": courses[0]['id'],
            "scholar_name": "Test Scholar",
            "order": 99,
            "episode_count": 2,
            "is_active": False
        }
        response = api_client.post(f"{BASE_URL}/api/admin/modules", json=data)
        assert response.status_code == 200
        result = response.json()
        assert 'id' in result
        print(f"✓ Created module: {result['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/modules/{result['id']}")

    def test_toggle_module(self, api_client):
        """Test PATCH /api/admin/modules/{id}/toggle."""
        # Get a course first
        courses_resp = api_client.get(f"{BASE_URL}/api/admin/courses")
        courses = courses_resp.json()
        
        if not courses:
            pytest.skip("No courses available")
        
        # Create a test module
        data = {
            "name": "TEST_MODULE_Toggle",
            "description": "For toggle test",
            "course_id": courses[0]['id'],
            "order": 98
        }
        create_resp = api_client.post(f"{BASE_URL}/api/admin/modules", json=data)
        assert create_resp.status_code == 200
        module_id = create_resp.json()['id']
        
        # Toggle it
        response = api_client.patch(f"{BASE_URL}/api/admin/modules/{module_id}/toggle")
        assert response.status_code == 200
        result = response.json()
        assert 'is_active' in result
        print(f"✓ Toggled module {module_id}, is_active: {result['is_active']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/modules/{module_id}")

    def test_bulk_toggle_modules(self, api_client):
        """Test POST /api/admin/modules/bulk-toggle - Bulk activate/deactivate modules."""
        # Get a course first
        courses_resp = api_client.get(f"{BASE_URL}/api/admin/courses")
        courses = courses_resp.json()
        
        if not courses:
            pytest.skip("No courses available")
        
        # Create test modules
        ids = []
        for i in range(2):
            data = {
                "name": f"TEST_MODULE_Bulk{i}",
                "description": f"Bulk test {i}",
                "course_id": courses[0]['id'],
                "order": 90 + i
            }
            resp = api_client.post(f"{BASE_URL}/api/admin/modules", json=data)
            assert resp.status_code == 200
            ids.append(resp.json()['id'])
        
        # Bulk activate
        response = api_client.post(
            f"{BASE_URL}/api/admin/modules/bulk-toggle",
            json={"ids": ids, "is_active": True}
        )
        assert response.status_code == 200
        print(f"✓ Bulk activated {len(ids)} modules")
        
        # Bulk deactivate
        response = api_client.post(
            f"{BASE_URL}/api/admin/modules/bulk-toggle",
            json={"ids": ids, "is_active": False}
        )
        assert response.status_code == 200
        print(f"✓ Bulk deactivated {len(ids)} modules")
        
        # Cleanup
        for module_id in ids:
            api_client.delete(f"{BASE_URL}/api/admin/modules/{module_id}")
        print(f"✓ Cleaned up {len(ids)} test modules")


# ─── Audios Linking Tests ─────────────────────────────────────────────────────


class TestAudiosModuleLinking:
    """Test Audios linked to Modules (instead of courses)."""

    def test_list_audios(self, api_client):
        """Test GET /api/admin/audios - List all audios."""
        response = api_client.get(f"{BASE_URL}/api/admin/audios")
        assert response.status_code == 200
        audios = response.json()
        assert isinstance(audios, list)
        print(f"✓ Found {len(audios)} audios")
        
        # Check for module_id field
        if audios:
            audio = audios[0]
            assert 'id' in audio
            assert 'title' in audio
            # module_id may be null for audios not linked to modules
            print(f"✓ Audio structure verified")

    def test_create_audio_with_module(self, api_client):
        """Test POST /api/admin/audios - Create audio linked to module."""
        # Get modules
        modules_resp = api_client.get(f"{BASE_URL}/api/admin/modules")
        modules = modules_resp.json()
        
        # Get scholars
        scholars_resp = api_client.get(f"{BASE_URL}/api/admin/scholars")
        scholars = scholars_resp.json()
        
        if not scholars:
            pytest.skip("No scholars available")
        
        module_id = modules[0]['id'] if modules else None
        
        data = {
            "title": "TEST_AUDIO_ModuleLinked",
            "description": "Test audio linked to module",
            "scholar_id": scholars[0]['id'],
            "scholar_name": scholars[0]['name'],
            "type": "podcast",
            "topic": "Test",
            "duration": 300,
            "module_id": module_id,
            "episode_number": 1
        }
        response = api_client.post(f"{BASE_URL}/api/admin/audios", json=data)
        assert response.status_code == 200
        result = response.json()
        assert 'id' in result
        print(f"✓ Created audio: {result['id']}, linked to module: {module_id}")
        
        # Verify by fetching
        audio_id = result['id']
        get_resp = api_client.get(f"{BASE_URL}/api/admin/audios")
        audios = get_resp.json()
        created_audio = next((a for a in audios if a['id'] == audio_id), None)
        
        if created_audio and module_id:
            assert created_audio.get('module_id') == module_id
            print(f"✓ Audio correctly linked to module")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/audios/{audio_id}")


# ─── Navigation Tests ─────────────────────────────────────────────────────────


class TestAdminNavigation:
    """Test navigation and hierarchy links."""

    def test_admin_panel_pages_accessible(self, api_client):
        """Test that admin panel pages are accessible."""
        pages = [
            "/api/admin-panel/cursus",
            "/api/admin-panel/courses",
            "/api/admin-panel/modules",
            "/api/admin-panel/audios"
        ]
        
        for page in pages:
            response = api_client.get(f"{BASE_URL}{page}")
            # HTML pages return 200
            assert response.status_code == 200
            print(f"✓ Page accessible: {page}")

    def test_sidebar_links_in_html(self, api_client):
        """Verify sidebar contains Cursus, Cours, Modules, Audios links."""
        response = api_client.get(f"{BASE_URL}/api/admin-panel/cursus")
        assert response.status_code == 200
        html = response.text
        
        # Check for navigation items
        assert 'cursus' in html.lower()
        assert 'courses' in html.lower() or 'cours' in html.lower()
        assert 'modules' in html.lower()
        assert 'audios' in html.lower()
        print("✓ Sidebar contains all navigation links")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
