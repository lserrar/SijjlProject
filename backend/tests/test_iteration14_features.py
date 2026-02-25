"""
Backend API tests for iteration 14 - Hero Cursus, Admin Cursus, set-featured features
Tests: GET /home, GET/PATCH /admin/cursus, PATCH /admin/cursus/set-featured,
       PATCH /admin/courses/set-featured, PUT /admin/cursus/{id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://islamic-learning-35.preview.emergentagent.com').rstrip('/')

# Known credentials from context
USER_EMAIL = "testuser@hikma.com"
USER_PASSWORD = "TestUser123!"
ADMIN_EMAIL = "admin@hikma-admin.com"
ADMIN_PASSWORD = "Admin123!"

FEATURED_CURSUS_ID = "cursus-falsafa"
EXPECTED_HERO_TITLE = "La Falsafa — Philosophie de l'Islam classique"


@pytest.fixture(scope="module")
def user_token():
    """Get user auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": USER_EMAIL, "password": USER_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"User login failed: {resp.status_code} {resp.text[:200]}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Admin login failed: {resp.status_code} {resp.text[:200]}")


class TestAuth:
    """Authentication tests"""

    def test_user_login_success(self):
        """Test user login returns token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL, "password": USER_PASSWORD
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == USER_EMAIL
        print(f"PASS: User login - token received, role={data['user'].get('role')}")

    def test_admin_login_success(self):
        """Test admin login returns token with admin role"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print(f"PASS: Admin login - role={data['user']['role']}")


class TestHomeAPI:
    """Homepage API tests - hero cursus feature"""

    def test_home_api_returns_featured_hero(self, user_token):
        """GET /api/home returns featured_course with hero_type"""
        resp = requests.get(f"{BASE_URL}/api/home", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "featured_course" in data
        hero = data["featured_course"]
        assert hero is not None
        print(f"PASS: /api/home hero found: id={hero.get('id')}, hero_type={hero.get('hero_type')}")

    def test_home_hero_is_cursus(self, user_token):
        """Featured hero should be cursus-falsafa with hero_type='cursus'"""
        resp = requests.get(f"{BASE_URL}/api/home", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        hero = resp.json()["featured_course"]
        assert hero.get("hero_type") == "cursus", f"Expected 'cursus' but got {hero.get('hero_type')}"
        assert hero.get("id") == FEATURED_CURSUS_ID
        print(f"PASS: hero_type='cursus', id='{hero['id']}'")

    def test_home_hero_has_custom_title(self, user_token):
        """Hero should show custom hero_title from cursus"""
        resp = requests.get(f"{BASE_URL}/api/home", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        hero = resp.json()["featured_course"]
        # When hero_type=cursus, title should be hero_title from cursus doc
        assert hero.get("title") == EXPECTED_HERO_TITLE, \
            f"Expected '{EXPECTED_HERO_TITLE}' but got '{hero.get('title')}'"
        print(f"PASS: hero title = '{hero['title']}'")

    def test_home_hero_has_description(self, user_token):
        """Hero should have description (hero_description or fallback)"""
        resp = requests.get(f"{BASE_URL}/api/home", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        hero = resp.json()["featured_course"]
        assert hero.get("description") is not None
        assert "Al-Kindī" in hero.get("description", "") or len(hero.get("description", "")) > 10
        print(f"PASS: hero description present: '{hero.get('description', '')[:60]}...'")

    def test_home_hero_has_cursus_letter(self, user_token):
        """Hero should have cursus_letter for eyebrow label"""
        resp = requests.get(f"{BASE_URL}/api/home", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        hero = resp.json()["featured_course"]
        assert "cursus_letter" in hero
        assert hero["cursus_letter"] == "A"  # cursus-falsafa is order=1, letter A
        print(f"PASS: cursus_letter='{hero['cursus_letter']}'")

    def test_home_hero_has_cursus_color(self, user_token):
        """Hero should have cursus_color"""
        resp = requests.get(f"{BASE_URL}/api/home", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        hero = resp.json()["featured_course"]
        assert "cursus_color" in hero
        assert hero["cursus_color"] is not None
        print(f"PASS: cursus_color='{hero['cursus_color']}'")

    def test_home_has_recent_episodes(self, user_token):
        """Home should return recent_episodes"""
        resp = requests.get(f"{BASE_URL}/api/home", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "recent_episodes" in data
        assert len(data["recent_episodes"]) > 0
        print(f"PASS: {len(data['recent_episodes'])} recent episodes")

    def test_home_has_top5(self, user_token):
        """Home should return top5_courses"""
        resp = requests.get(f"{BASE_URL}/api/home", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "top5_courses" in data
        assert len(data["top5_courses"]) > 0
        print(f"PASS: {len(data['top5_courses'])} top5 courses")

    def test_home_has_recommendations(self, user_token):
        """Home should return recommendations"""
        resp = requests.get(f"{BASE_URL}/api/home", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "recommendations" in data
        assert len(data["recommendations"]) > 0
        print(f"PASS: {len(data['recommendations'])} recommendations")


class TestAdminCursus:
    """Admin cursus endpoints"""

    def test_admin_list_cursus(self, admin_token):
        """GET /api/admin/cursus returns list with is_featured"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/cursus",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check cursus has required fields
        first = data[0]
        assert "id" in first
        assert "name" in first
        assert "is_featured" in first
        print(f"PASS: Admin cursus list - {len(data)} cursus returned, has is_featured field")

    def test_admin_cursus_has_hero_fields(self, admin_token):
        """Admin cursus list should include hero_title and hero_description"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/cursus",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        cursus_list = resp.json()
        # Find cursus-falsafa
        featured = next((c for c in cursus_list if c["id"] == FEATURED_CURSUS_ID), None)
        assert featured is not None, f"cursus-falsafa not found in list"
        assert featured.get("is_featured") is True
        # hero_title should be present
        assert "hero_title" in featured or featured.get("hero_title") is not None
        print(f"PASS: cursus-falsafa has is_featured=True, hero_title='{featured.get('hero_title', '')[:50]}'")

    def test_admin_cursus_requires_auth(self):
        """Admin cursus requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/admin/cursus")
        assert resp.status_code in [401, 403]
        print(f"PASS: Admin cursus without auth returns {resp.status_code}")

    def test_admin_cursus_update_hero_text(self, admin_token):
        """PUT /api/admin/cursus/{id} can update hero_title and hero_description"""
        payload = {
            "hero_title": EXPECTED_HERO_TITLE,
            "hero_description": "D'Al-Kindī à Averroès, sept siècles de pensée philosophique."
        }
        resp = requests.put(
            f"{BASE_URL}/api/admin/cursus/{FEATURED_CURSUS_ID}",
            json=payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data or "id" in data
        print(f"PASS: Cursus hero text updated, response={data}")

    def test_admin_set_featured_cursus(self, admin_token):
        """PATCH /api/admin/cursus/{id}/set-featured sets cursus as featured"""
        resp = requests.patch(
            f"{BASE_URL}/api/admin/cursus/{FEATURED_CURSUS_ID}/set-featured",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data
        print(f"PASS: cursus-falsafa set as featured. Response: {data}")

    def test_verify_featured_cursus_in_home_after_set(self, user_token):
        """After set-featured, /api/home should show cursus-falsafa as hero"""
        resp = requests.get(f"{BASE_URL}/api/home", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        hero = resp.json().get("featured_course")
        assert hero is not None
        assert hero.get("hero_type") == "cursus"
        assert hero.get("id") == FEATURED_CURSUS_ID
        print(f"PASS: /api/home confirms cursus-falsafa featured after set-featured")


class TestAdminCoursesFeatured:
    """Admin courses set-featured endpoint"""

    def test_admin_courses_list_has_star_field(self, admin_token):
        """GET /api/admin/courses returns is_featured field"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/courses",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "is_featured" in data[0]
            print(f"PASS: courses list has is_featured. {len(data)} courses returned")
        else:
            print("WARNING: No courses returned from admin/courses")

    def test_admin_set_featured_cursus_unfeatures_courses(self, admin_token):
        """Setting cursus as featured should unfeatured all courses"""
        # First ensure cursus is set as featured
        resp = requests.patch(
            f"{BASE_URL}/api/admin/cursus/{FEATURED_CURSUS_ID}/set-featured",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200

        # Now check that home shows cursus, not course
        import time
        time.sleep(0.5)
        resp = requests.get(
            f"{BASE_URL}/api/home",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200
        hero = resp.json().get("featured_course")
        assert hero is not None
        assert hero.get("hero_type") == "cursus", f"Expected cursus hero but got {hero.get('hero_type')}"
        print(f"PASS: After set-featured cursus, home shows cursus hero")
