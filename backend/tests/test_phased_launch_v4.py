"""
Test suite for Sijill Phased Launch V4 (Migration v4).
Covers:
- /api/cursus: 7 cursus with correct order + letters (A-G)
- /api/courses: new fields (is_launch_catalog, youtube_url, coming_soon, available_date)
- cursus-histoire: 4 placeholder courses
- youtube_url on cours-andalus, cours-historiographie
- /api/audios: youtube_url persistence
- Admin update endpoints: PUT /api/admin/courses/{id}, PUT /api/admin/audios/{id}
- Existing flows: /api/preregistration, /api/blog/posts
"""
import os
import pytest
import requests

BASE_URL = "https://phased-launch-1.preview.emergentagent.com"
ADMIN_EMAIL = "loubna.serrar@gmail.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login",
                 json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    if not tok:
        pytest.skip(f"No token in login response: {data}")
    return tok


# ----------------- Cursus -----------------
class TestCursus:
    def test_cursus_returns_7_with_order_and_letter(self, api):
        r = api.get(f"{BASE_URL}/api/cursus")
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        assert len(items) == 7, f"Expected 7 cursus, got {len(items)}: {[i.get('id') for i in items]}"

        by_order = {i["order"]: i for i in items}
        expected = {
            1: "cursus-histoire",
            2: "cursus-theologie",
            3: "cursus-sciences-islamiques",
            4: "cursus-arts",
            5: "cursus-falsafa",
            6: "cursus-spiritualites",
            7: "cursus-pensees-non-islamiques",
        }
        for order, cid in expected.items():
            assert order in by_order, f"order {order} missing. Orders: {list(by_order.keys())}"
            assert by_order[order]["id"] == cid, f"order {order} expected {cid} got {by_order[order]['id']}"

        # Letter A-G
        letters_expected = {1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F", 7: "G"}
        for order, letter in letters_expected.items():
            got = by_order[order].get("letter")
            assert got == letter, f"order {order} expected letter {letter} got {got}"


# ----------------- Courses (Histoire) -----------------
class TestCoursesHistoire:
    def test_histoire_has_4_launch_courses(self, api):
        r = api.get(f"{BASE_URL}/api/courses", params={"cursus_id": "cursus-histoire"})
        assert r.status_code == 200, r.text
        courses = r.json()
        ids = {c["id"]: c for c in courses}
        for expected in ["cours-debuts-islam", "cours-andalus", "cours-mamelouke", "cours-ottoman"]:
            assert expected in ids, f"{expected} missing from histoire courses: {list(ids.keys())}"
            assert ids[expected].get("is_launch_catalog") is True, f"{expected} is_launch_catalog not True"

    def test_mamelouke_coming_soon_mai_2026(self, api):
        r = api.get(f"{BASE_URL}/api/courses/cours-mamelouke")
        assert r.status_code == 200, r.text
        c = r.json()
        assert c.get("coming_soon") is True
        assert c.get("available_date") == "mai 2026", f"got {c.get('available_date')}"

    def test_ottoman_coming_soon_sept_2026(self, api):
        r = api.get(f"{BASE_URL}/api/courses/cours-ottoman")
        assert r.status_code == 200, r.text
        c = r.json()
        assert c.get("coming_soon") is True
        assert c.get("available_date") == "sept. 2026", f"got {c.get('available_date')}"

    def test_andalus_youtube_url(self, api):
        r = api.get(f"{BASE_URL}/api/courses/cours-andalus")
        assert r.status_code == 200, r.text
        c = r.json()
        assert c.get("youtube_url") == "https://youtu.be/cow2JfYaSC0", f"got {c.get('youtube_url')}"
        assert c.get("is_launch_catalog") is True

    def test_historiographie_youtube_url(self, api):
        r = api.get(f"{BASE_URL}/api/courses/cours-historiographie")
        assert r.status_code == 200, r.text
        c = r.json()
        assert c.get("youtube_url") == "https://youtu.be/RUc8p0K6Qg4", f"got {c.get('youtube_url')}"


# ----------------- Courses (general shape) -----------------
class TestCoursesShape:
    def test_courses_expose_new_fields(self, api):
        """Courses with youtube_url/coming_soon/available_date set should expose them. 
        Note: API strips None values so only courses with data will have them."""
        r = api.get(f"{BASE_URL}/api/courses")
        assert r.status_code == 200
        courses = r.json()
        assert len(courses) > 0
        # is_launch_catalog should be on every course (bool, not None)
        for c in courses:
            assert "is_launch_catalog" in c, f"is_launch_catalog missing on {c.get('id')}"
        # Verify at least one course exposes youtube_url (andalus)
        andalus = next((c for c in courses if c["id"] == "cours-andalus"), None)
        assert andalus is not None
        assert andalus.get("youtube_url") == "https://youtu.be/cow2JfYaSC0"

    def test_launch_catalog_count(self, api):
        r = api.get(f"{BASE_URL}/api/courses")
        assert r.status_code == 200
        courses = r.json()
        launch = [c for c in courses if c.get("is_launch_catalog") is True]
        # Spec: 15 in / 9 out (per startup log). So we expect >=15 launch.
        assert len(launch) >= 15, f"Expected >=15 launch_catalog courses, got {len(launch)}"


# ----------------- Audios -----------------
class TestAudios:
    def test_traduction_audios_has_youtube_url(self, api):
        r = api.get(f"{BASE_URL}/api/audios", params={"course_id": "cours-traduction"})
        assert r.status_code == 200, r.text
        audios = r.json()
        assert len(audios) > 0, "no audios for cours-traduction"
        with_yt = [a for a in audios if a.get("youtube_url")]
        assert len(with_yt) >= 1, f"No audio has youtube_url. Sample: {audios[0] if audios else 'none'}"


# ----------------- Admin PUT -----------------
class TestAdminUpdate:
    def test_admin_put_course_persists_new_fields(self, api, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        cid = "cours-andalus"
        # Read current
        before = api.get(f"{BASE_URL}/api/courses/{cid}").json()
        payload = {
            "youtube_url": "https://youtu.be/cow2JfYaSC0",  # keep same
            "is_launch_catalog": True,
            "coming_soon": False,
            "available_date": "TEST_date",
        }
        r = api.put(f"{BASE_URL}/api/admin/courses/{cid}", json=payload, headers=headers)
        assert r.status_code in (200, 204), f"Admin PUT failed: {r.status_code} {r.text[:300]}"

        after = api.get(f"{BASE_URL}/api/courses/{cid}").json()
        assert after.get("available_date") == "TEST_date", f"available_date not persisted: {after.get('available_date')}"
        assert after.get("is_launch_catalog") is True

        # Restore original
        restore = {
            "youtube_url": before.get("youtube_url"),
            "is_launch_catalog": before.get("is_launch_catalog"),
            "coming_soon": before.get("coming_soon"),
            "available_date": before.get("available_date"),
        }
        api.put(f"{BASE_URL}/api/admin/courses/{cid}", json=restore, headers=headers)

    def test_admin_put_audio_persists_youtube_url(self, api, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = api.get(f"{BASE_URL}/api/audios", params={"course_id": "cours-traduction"})
        audios = r.json()
        assert len(audios) > 0
        audio = audios[0]
        aid = audio["id"]
        original = audio.get("youtube_url")
        test_url = "https://youtu.be/TEST12345AB"
        rr = api.put(f"{BASE_URL}/api/admin/audios/{aid}", json={"youtube_url": test_url}, headers=headers)
        assert rr.status_code in (200, 204), f"Admin PUT audio failed: {rr.status_code} {rr.text[:300]}"
        # Read back
        r2 = api.get(f"{BASE_URL}/api/audios", params={"course_id": "cours-traduction"})
        updated = next((a for a in r2.json() if a["id"] == aid), None)
        assert updated is not None
        assert updated.get("youtube_url") == test_url, f"got {updated.get('youtube_url')}"
        # Restore
        api.put(f"{BASE_URL}/api/admin/audios/{aid}", json={"youtube_url": original or ""}, headers=headers)


# ----------------- Existing flows -----------------
class TestExistingFlows:
    def test_preregistration_post(self, api):
        r = api.post(f"{BASE_URL}/api/preregistration", json={
            "email": "TEST_preregv4@example.com",
            "prenom": "TestV4",
            "nom": "Prereg",
        })
        # Accept 200/201, or 409 if already registered from previous run
        assert r.status_code in (200, 201, 409), f"preregistration failed: {r.status_code} {r.text[:300]}"

    def test_blog_posts_list(self, api):
        r = api.get(f"{BASE_URL}/api/blog")
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, (list, dict))

    def test_home_site_loads(self, api):
        r = api.get(f"{BASE_URL}/api/site/")
        assert r.status_code == 200, f"home SPA not served: {r.status_code}"
        assert "<html" in r.text.lower() or "<!doctype" in r.text.lower()
