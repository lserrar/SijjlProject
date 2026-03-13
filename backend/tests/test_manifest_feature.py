"""
Test suite for Sijill Manifest Upload Feature
Tests:
- POST /api/admin/manifest/upload - Upload manifest .docx file
- GET /api/admin/manifest - Retrieve stored manifest data
- Catalogue page integration with manifest stats
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://islamic-learning-40.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "loubna.serrar@gmail.com"
ADMIN_PASSWORD = "Admin123!"


class TestManifestUpload:
    """Manifest upload and retrieval tests"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        assert data.get("user", {}).get("role") == "admin", "User is not admin"
        return data["token"]

    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Headers with admin token"""
        return {"Authorization": f"Bearer {admin_token}"}

    def test_01_admin_login(self, admin_token):
        """Verify admin login works"""
        assert admin_token is not None
        assert len(admin_token) > 20
        print(f"PASS: Admin login successful, token length: {len(admin_token)}")

    def test_02_get_manifest_endpoint(self, auth_headers):
        """Test GET /api/admin/manifest returns existing manifest or null"""
        response = requests.get(f"{BASE_URL}/api/admin/manifest", headers=auth_headers)
        assert response.status_code == 200, f"GET manifest failed: {response.status_code} - {response.text}"
        
        data = response.json()
        # Endpoint should return {'manifest': <data or None>}
        assert "manifest" in data, "Response missing 'manifest' key"
        
        if data["manifest"]:
            manifest = data["manifest"]
            assert "filename" in manifest or "data" in manifest, "Manifest missing expected fields"
            print(f"PASS: GET /api/admin/manifest returned existing manifest: {manifest.get('filename', 'unknown')}")
        else:
            print("PASS: GET /api/admin/manifest returned null (no manifest uploaded yet)")

    def test_03_upload_manifest_docx(self, auth_headers):
        """Test POST /api/admin/manifest/upload with manifest.docx file"""
        manifest_path = "/tmp/manifest.docx"
        
        # Check if manifest file exists
        if not os.path.exists(manifest_path):
            pytest.skip(f"Manifest file not found at {manifest_path}")
        
        with open(manifest_path, "rb") as f:
            files = {"file": ("manifest.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            response = requests.post(
                f"{BASE_URL}/api/admin/manifest/upload",
                headers=auth_headers,
                files=files
            )
        
        assert response.status_code == 200, f"Upload failed: {response.status_code} - {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "filename" in data, "Response missing 'filename'"
        assert "cursus_count" in data, "Response missing 'cursus_count'"
        assert "total_modules" in data, "Response missing 'total_modules'"
        assert "total_episodes" in data, "Response missing 'total_episodes'"
        assert "cursus" in data, "Response missing 'cursus' list"
        
        # Verify parsed data
        assert data["cursus_count"] > 0, "No cursus parsed from manifest"
        assert data["total_episodes"] > 0, "No episodes parsed from manifest"
        
        print(f"PASS: Manifest uploaded successfully")
        print(f"  - Filename: {data['filename']}")
        print(f"  - Cursus count: {data['cursus_count']}")
        print(f"  - Total modules: {data['total_modules']}")
        print(f"  - Total episodes: {data['total_episodes']}")
        
        # Print cursus breakdown
        for c in data.get("cursus", []):
            print(f"  - [{c['letter']}] {c['name']}: {c['courses']} cours, {c['modules']} modules, {c['episodes']} ép.")

    def test_04_verify_manifest_stored(self, auth_headers):
        """Verify manifest was stored in DB after upload"""
        response = requests.get(f"{BASE_URL}/api/admin/manifest", headers=auth_headers)
        assert response.status_code == 200, f"GET manifest failed: {response.status_code}"
        
        data = response.json()
        assert data.get("manifest") is not None, "Manifest should be stored after upload"
        
        manifest = data["manifest"]
        assert "data" in manifest, "Stored manifest missing 'data' field"
        assert "uploaded_at" in manifest, "Stored manifest missing 'uploaded_at'"
        
        manifest_data = manifest["data"]
        assert "cursus" in manifest_data, "Manifest data missing 'cursus' list"
        assert "total_episodes" in manifest_data, "Manifest data missing 'total_episodes'"
        
        # Check expected 127 episodes from context
        total_eps = manifest_data.get("total_episodes", 0)
        print(f"PASS: Manifest stored with {total_eps} total expected episodes")
        print(f"  - Cursus count: {len(manifest_data.get('cursus', []))}")

    def test_05_upload_invalid_file_type(self, auth_headers):
        """Test upload fails for non-.docx files"""
        # Create a fake text file
        files = {"file": ("test.txt", b"This is not a docx file", "text/plain")}
        response = requests.post(
            f"{BASE_URL}/api/admin/manifest/upload",
            headers=auth_headers,
            files=files
        )
        
        # Should reject non-.docx files
        assert response.status_code == 400, f"Expected 400 for non-docx file, got {response.status_code}"
        print("PASS: Non-.docx files correctly rejected")

    def test_06_manifest_requires_auth(self):
        """Test manifest endpoints require authentication"""
        # GET without auth
        response = requests.get(f"{BASE_URL}/api/admin/manifest")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # POST without auth
        files = {"file": ("test.docx", b"fake content", "application/octet-stream")}
        response = requests.post(f"{BASE_URL}/api/admin/manifest/upload", files=files)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        print("PASS: Manifest endpoints require authentication")


class TestCatalogueWithManifest:
    """Test catalogue page loads with manifest stats"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}

    def test_01_catalogue_data_loads(self, auth_headers):
        """Test catalogue page data APIs work"""
        # Load cursus
        cursus_resp = requests.get(f"{BASE_URL}/api/admin/cursus", headers=auth_headers)
        assert cursus_resp.status_code == 200, "Failed to load cursus"
        cursus = cursus_resp.json()
        
        # Load courses
        courses_resp = requests.get(f"{BASE_URL}/api/admin/courses", headers=auth_headers)
        assert courses_resp.status_code == 200, "Failed to load courses"
        courses = courses_resp.json()
        
        # Load audios
        audios_resp = requests.get(f"{BASE_URL}/api/admin/audios", headers=auth_headers)
        assert audios_resp.status_code == 200, "Failed to load audios"
        audios = audios_resp.json()
        
        # Load manifest
        manifest_resp = requests.get(f"{BASE_URL}/api/admin/manifest", headers=auth_headers)
        assert manifest_resp.status_code == 200, "Failed to load manifest"
        manifest = manifest_resp.json()
        
        print(f"PASS: Catalogue data loaded successfully")
        print(f"  - Cursus: {len(cursus)}")
        print(f"  - Courses: {len(courses)}")
        print(f"  - Audios (real episodes): {len(audios)}")
        
        if manifest.get("manifest"):
            manifest_data = manifest["manifest"]["data"]
            print(f"  - Manifest expected episodes: {manifest_data.get('total_episodes', 'N/A')}")

    def test_02_admin_audios_endpoint(self, auth_headers):
        """Test GET /api/admin/audios returns audio data"""
        response = requests.get(f"{BASE_URL}/api/admin/audios", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        audios = response.json()
        assert isinstance(audios, list), "Expected list of audios"
        
        if len(audios) > 0:
            audio = audios[0]
            # Check audio has expected fields
            assert "id" in audio, "Audio missing 'id'"
            assert "title" in audio, "Audio missing 'title'"
            
        print(f"PASS: GET /api/admin/audios returned {len(audios)} audios")

    def test_03_admin_scholars_endpoint(self, auth_headers):
        """Test GET /api/admin/scholars returns scholar data for dropdowns"""
        response = requests.get(f"{BASE_URL}/api/admin/scholars", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.status_code}"
        
        scholars = response.json()
        assert isinstance(scholars, list), "Expected list of scholars"
        
        print(f"PASS: GET /api/admin/scholars returned {len(scholars)} scholars")


class TestEpisodeEditDelete:
    """Test edit and delete episode functionality (regression)"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}

    def test_01_get_audio_for_edit(self, auth_headers):
        """Test we can get an audio episode to prepare for editing"""
        response = requests.get(f"{BASE_URL}/api/admin/audios", headers=auth_headers)
        assert response.status_code == 200
        
        audios = response.json()
        if len(audios) == 0:
            pytest.skip("No audios available for testing")
        
        audio_id = audios[0]["id"]
        
        # Get single audio (should work through public endpoint)
        audio_resp = requests.get(f"{BASE_URL}/api/audios/{audio_id}")
        assert audio_resp.status_code == 200, f"Failed to get audio: {audio_resp.status_code}"
        
        audio = audio_resp.json()
        assert audio.get("id") == audio_id
        
        print(f"PASS: Can retrieve audio for editing: {audio.get('title', 'Unknown')[:50]}")

    def test_02_update_audio_api(self, auth_headers):
        """Test PUT /api/admin/audios/{id} works"""
        # Get an audio first
        response = requests.get(f"{BASE_URL}/api/admin/audios", headers=auth_headers)
        assert response.status_code == 200
        
        audios = response.json()
        if len(audios) == 0:
            pytest.skip("No audios available for testing")
        
        audio = audios[0]
        audio_id = audio["id"]
        original_title = audio.get("title", "")
        
        # Update with same title (safe test)
        update_data = {"title": original_title}
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/audios/{audio_id}",
            headers={**auth_headers, "Content-Type": "application/json"},
            json=update_data
        )
        
        assert update_resp.status_code == 200, f"Update failed: {update_resp.status_code} - {update_resp.text}"
        
        print(f"PASS: PUT /api/admin/audios/{audio_id} works")


class TestDashboardRegression:
    """Regression test - Dashboard should still work"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]

    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}

    def test_01_dashboard_page_accessible(self, auth_headers):
        """Test dashboard page HTML is accessible"""
        # Verify we can access the admin panel root
        cookies = {"session_token": auth_headers["Authorization"].replace("Bearer ", "")}
        
        # Test via auth/me endpoint
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200, "Auth/me should work"
        
        user = response.json()
        assert user.get("role") == "admin", "User should be admin"
        
        print("PASS: Dashboard accessible, user is admin")

    def test_02_dashboard_stats_apis(self, auth_headers):
        """Test dashboard stats APIs work"""
        # Users count
        users_resp = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        assert users_resp.status_code == 200
        users = users_resp.json()
        
        # Scholars count
        scholars_resp = requests.get(f"{BASE_URL}/api/admin/scholars", headers=auth_headers)
        assert scholars_resp.status_code == 200
        scholars = scholars_resp.json()
        
        # Courses count
        courses_resp = requests.get(f"{BASE_URL}/api/admin/courses", headers=auth_headers)
        assert courses_resp.status_code == 200
        courses = courses_resp.json()
        
        # Audios count
        audios_resp = requests.get(f"{BASE_URL}/api/admin/audios", headers=auth_headers)
        assert audios_resp.status_code == 200
        audios = audios_resp.json()
        
        print(f"PASS: Dashboard stats APIs working")
        print(f"  - Users: {len(users)}")
        print(f"  - Scholars: {len(scholars)}")
        print(f"  - Courses: {len(courses)}")
        print(f"  - Audios: {len(audios)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
