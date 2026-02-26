"""
Test Suite for User Stats and Library Endpoints
Tests:
- GET /api/user/stats - User statistics (courses_followed, listening_hours, favorites_count, etc.)
- GET /api/user/library - Library data (in_progress, favorites, completed, global_progress)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sijill-preview-1.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "testuser@hikma.com"
TEST_USER_PASSWORD = "TestUser123!"


class TestUserStatsEndpoint:
    """Tests for /api/user/stats endpoint"""

    @pytest.fixture
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]

    def test_stats_requires_auth(self):
        """Test that /api/user/stats returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/user/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_stats_returns_correct_structure(self, auth_token):
        """Test that /api/user/stats returns expected data structure"""
        response = requests.get(
            f"{BASE_URL}/api/user/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required fields exist
        required_fields = ["courses_followed", "listening_hours", "favorites_count", "completed_count", "in_progress_count"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify data types
        assert isinstance(data["courses_followed"], int), "courses_followed should be int"
        assert isinstance(data["listening_hours"], (int, float)), "listening_hours should be numeric"
        assert isinstance(data["favorites_count"], int), "favorites_count should be int"
        assert isinstance(data["completed_count"], int), "completed_count should be int"
        assert isinstance(data["in_progress_count"], int), "in_progress_count should be int"
        
        # Verify non-negative values
        assert data["courses_followed"] >= 0, "courses_followed should be non-negative"
        assert data["listening_hours"] >= 0, "listening_hours should be non-negative"
        assert data["favorites_count"] >= 0, "favorites_count should be non-negative"
        assert data["completed_count"] >= 0, "completed_count should be non-negative"
        assert data["in_progress_count"] >= 0, "in_progress_count should be non-negative"
        
        print(f"User stats: {data}")


class TestUserLibraryEndpoint:
    """Tests for /api/user/library endpoint"""

    @pytest.fixture
    def auth_token(self):
        """Get authentication token for test user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]

    def test_library_requires_auth(self):
        """Test that /api/user/library returns 401 without authentication"""
        response = requests.get(f"{BASE_URL}/api/user/library")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_library_returns_correct_structure(self, auth_token):
        """Test that /api/user/library returns expected data structure"""
        response = requests.get(
            f"{BASE_URL}/api/user/library",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required top-level fields
        required_fields = ["in_progress", "favorites", "completed", "global_progress"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify data types for top-level fields
        assert isinstance(data["in_progress"], list), "in_progress should be a list"
        assert isinstance(data["favorites"], list), "favorites should be a list"
        assert isinstance(data["completed"], list), "completed should be a list"
        assert isinstance(data["global_progress"], (int, float)), "global_progress should be numeric"
        
        # Verify global_progress is in valid range
        assert 0 <= data["global_progress"] <= 100, f"global_progress should be 0-100, got {data['global_progress']}"
        
        print(f"Library data - in_progress: {len(data['in_progress'])}, favorites: {len(data['favorites'])}, completed: {len(data['completed'])}, global_progress: {data['global_progress']}%")

    def test_library_in_progress_item_structure(self, auth_token):
        """Test that in_progress items have correct structure (if any exist)"""
        response = requests.get(
            f"{BASE_URL}/api/user/library",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # If in_progress items exist, verify their structure
        if len(data["in_progress"]) > 0:
            item = data["in_progress"][0]
            expected_fields = ["id", "title", "cursus_letter", "cursus_color", "progress"]
            for field in expected_fields:
                assert field in item, f"in_progress item missing field: {field}"
            
            # Verify progress is valid percentage
            assert 0 <= item["progress"] <= 100, f"progress should be 0-100, got {item['progress']}"
            print(f"Sample in_progress item: {item['title']} - {item['progress']}%")
        else:
            print("No in_progress items found (expected for new user)")

    def test_library_favorites_item_structure(self, auth_token):
        """Test that favorites items have correct structure (if any exist)"""
        response = requests.get(
            f"{BASE_URL}/api/user/library",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # If favorites exist, verify their structure
        if len(data["favorites"]) > 0:
            item = data["favorites"][0]
            expected_fields = ["id", "title", "cursus_letter", "cursus_color", "duration_minutes", "saved_date"]
            for field in expected_fields:
                assert field in item, f"favorites item missing field: {field}"
            print(f"Sample favorite item: {item['title']} - saved {item['saved_date']}")
        else:
            print("No favorites found (expected for new user)")

    def test_library_completed_item_structure(self, auth_token):
        """Test that completed items have correct structure (if any exist)"""
        response = requests.get(
            f"{BASE_URL}/api/user/library",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # If completed items exist, verify their structure
        if len(data["completed"]) > 0:
            item = data["completed"][0]
            expected_fields = ["id", "title", "cursus_letter", "cursus_color", "total_minutes"]
            for field in expected_fields:
                assert field in item, f"completed item missing field: {field}"
            print(f"Sample completed item: {item['title']} - {item['total_minutes']} min")
        else:
            print("No completed items found (expected for new user)")


class TestUserAuthentication:
    """Tests for authentication flow required by stats/library endpoints"""

    def test_login_with_test_credentials(self):
        """Verify test user can login successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Missing token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == TEST_USER_EMAIL, "Email mismatch"
        print(f"Login successful for user: {data['user']['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
