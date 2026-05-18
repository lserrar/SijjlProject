"""
Iteration 34 — Migration v15e (Sijill_Catalogue_Lancement_Mai2026) backend validation.

Coverage:
- /api/catalogue ONLY launch courses (is_launch_catalog=True), expected 22 items, required fields.
- /api/cursus returns 7 cursus with dynamic course_count summing to 32.
- /api/courses?cursus_id=... per-cursus expected counts + recruiting flags.
- Maïmonide integrity (cours-philo-juive) — seed_locked respected (no overwrite of title/desc/summary).
- cours-maths-arabes & cours-sciences-naturelles separate, launch, coming_soon, mai 2026.
- Old umbrella courses deactivated (is_active=False) and excluded from /api/catalogue and /api/courses lists.
- cours-andalus available_date cleaned (not 'TEST_date').
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://phased-launch-1.preview.emergentagent.com").rstrip("/")

REQUIRED_CATALOGUE_FIELDS = {"id", "title", "coming_soon", "available_date", "recruiting", "episode_count", "cursus_id"}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- /api/catalogue ---
class TestCatalogue:
    def test_catalogue_returns_22_items_launch_only(self, session):
        r = session.get(f"{BASE_URL}/api/catalogue", timeout=30)
        assert r.status_code == 200
        data = r.json()
        items = data["items"] if isinstance(data, dict) and "items" in data else data
        assert isinstance(items, list)
        assert len(items) == 22, f"Expected 22 launch entries, got {len(items)}"

    def test_catalogue_item_required_fields(self, session):
        r = session.get(f"{BASE_URL}/api/catalogue", timeout=30)
        data = r.json()
        items = data["items"] if isinstance(data, dict) and "items" in data else data
        for it in items:
            missing = REQUIRED_CATALOGUE_FIELDS - set(it.keys())
            assert not missing, f"Item {it.get('id')} missing fields: {missing}"

    def test_catalogue_excludes_deactivated_umbrella_courses(self, session):
        r = session.get(f"{BASE_URL}/api/catalogue", timeout=30)
        items = r.json()
        items = items["items"] if isinstance(items, dict) and "items" in items else items
        ids = {it.get("id") for it in items} | {it.get("course_id") for it in items}
        for dead in ["cours-sciences", "cours-inclassables", "cours-falsafa-persan", "cours-falsafa-grands"]:
            assert dead not in ids, f"Deactivated course {dead} should NOT appear in /api/catalogue"


# --- /api/cursus ---
class TestCursus:
    def test_cursus_returns_7(self, session):
        r = session.get(f"{BASE_URL}/api/cursus", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list)
        assert len(d) == 7, f"Expected 7 cursus, got {len(d)}"

    def test_cursus_total_course_count_equals_32(self, session):
        r = session.get(f"{BASE_URL}/api/cursus", timeout=30)
        total = sum(c.get("course_count", 0) for c in r.json())
        assert total == 32, f"Expected total course_count=32 (4+2+5+7+11+1+2), got {total}"

    @pytest.mark.parametrize("cid,expected", [
        ("cursus-histoire", 4),
        ("cursus-theologie", 2),
        ("cursus-sciences-islamiques", 5),
        ("cursus-arts", 7),
        ("cursus-falsafa", 11),
        ("cursus-spiritualites", 1),
        ("cursus-pensees-non-islamiques", 2),
    ])
    def test_per_cursus_dynamic_count(self, session, cid, expected):
        r = session.get(f"{BASE_URL}/api/cursus", timeout=30)
        cur = next((c for c in r.json() if c["id"] == cid), None)
        assert cur is not None, f"{cid} missing"
        assert cur.get("course_count") == expected, f"{cid}: expected {expected} got {cur.get('course_count')}"


# --- /api/courses?cursus_id=... ---
class TestCoursesPerCursus:
    def test_falsafa_11_courses_includes_vision_cible(self, session):
        r = session.get(f"{BASE_URL}/api/courses?cursus_id=cursus-falsafa", timeout=30)
        assert r.status_code == 200
        cs = r.json()
        assert len(cs) == 11, f"Expected 11 falsafa courses, got {len(cs)}"
        ids = {c["id"] for c in cs}
        for must in ["cours-post-avicennisme", "cours-logique", "cours-ismaelisme",
                     "cours-al-kindi", "cours-al-farabi", "cours-avicenne"]:
            assert must in ids, f"{must} missing from cursus-falsafa"

    def test_arts_7_courses_with_2_recruiting(self, session):
        r = session.get(f"{BASE_URL}/api/courses?cursus_id=cursus-arts", timeout=30)
        cs = r.json()
        assert len(cs) == 7, f"Expected 7 arts courses, got {len(cs)}"
        recruiting = {c["id"] for c in cs if c.get("recruiting") is True}
        assert recruiting == {"cours-urjuza", "cours-geographie"}, f"Recruiting mismatch: {recruiting}"

    def test_sciences_islamiques_5_courses_with_2_recruiting(self, session):
        r = session.get(f"{BASE_URL}/api/courses?cursus_id=cursus-sciences-islamiques", timeout=30)
        cs = r.json()
        assert len(cs) == 5, f"Expected 5 sciences-islamiques courses, got {len(cs)}"
        recruiting = {c["id"] for c in cs if c.get("recruiting") is True}
        assert recruiting == {"cours-doxographie", "cours-autobiographies"}, f"Recruiting mismatch: {recruiting}"


# --- Maïmonide (cours-philo-juive) integrity ---
class TestMaimonideIntegrity:
    def test_maimonide_exists_and_seed_locked(self, session):
        r = session.get(f"{BASE_URL}/api/courses/cours-philo-juive", timeout=30)
        assert r.status_code == 200
        d = r.json()
        # ID preserved
        assert d["id"] == "cours-philo-juive"
        # seed_locked respected
        assert d.get("seed_locked") is True, "Maïmonide must have seed_locked=true"
        # Structural fields applied
        assert d.get("is_launch_catalog") is True
        assert d.get("is_active") is True

    def test_maimonide_title_not_overwritten_to_generic(self, session):
        """Title must NOT have been overwritten to an empty/placeholder/generic string by v15e."""
        r = session.get(f"{BASE_URL}/api/courses/cours-philo-juive", timeout=30)
        d = r.json()
        title = d.get("title", "")
        # Must contain Maïmonide or philosophie juive — both acceptable. Empty/None NOT acceptable.
        assert title and len(title) > 5
        low = title.lower()
        assert ("maïmonide" in low) or ("juive" in low), f"Maïmonide title unexpectedly changed: {title!r}"


# --- Maths arabes & Sciences naturelles (separate courses) ---
class TestMathsSciences:
    @pytest.mark.parametrize("cid", ["cours-maths-arabes", "cours-sciences-naturelles"])
    def test_separate_launch_coming_soon_mai2026(self, session, cid):
        r = session.get(f"{BASE_URL}/api/courses/{cid}", timeout=30)
        assert r.status_code == 200, f"{cid} should exist"
        d = r.json()
        assert d.get("is_active") is True, f"{cid} should be active"
        assert d.get("is_launch_catalog") is True, f"{cid} should be is_launch_catalog"
        assert d.get("coming_soon") is True, f"{cid} should have coming_soon=true"
        ad = (d.get("available_date") or "").lower()
        assert "mai" in ad and "2026" in ad, f"{cid} available_date should be 'mai 2026', got {d.get('available_date')!r}"


# --- Deactivated old umbrella courses ---
class TestDeactivatedOldCourses:
    @pytest.mark.parametrize("cid", ["cours-sciences", "cours-inclassables", "cours-falsafa-persan", "cours-falsafa-grands"])
    def test_old_course_deactivated(self, session, cid):
        r = session.get(f"{BASE_URL}/api/courses/{cid}", timeout=30)
        if r.status_code == 404:
            return  # acceptable — fully removed
        d = r.json()
        assert d.get("is_active") is False, f"{cid} should be is_active=false"
        assert d.get("is_launch_catalog") is False, f"{cid} should be excluded from launch"

    def test_old_course_not_in_per_cursus_list(self, session):
        all_ids = set()
        for cid in ["cursus-histoire", "cursus-theologie", "cursus-sciences-islamiques",
                    "cursus-arts", "cursus-falsafa", "cursus-spiritualites", "cursus-pensees-non-islamiques"]:
            r = session.get(f"{BASE_URL}/api/courses?cursus_id={cid}", timeout=30)
            for c in r.json():
                all_ids.add(c["id"])
        for dead in ["cours-sciences", "cours-inclassables", "cours-falsafa-persan", "cours-falsafa-grands"]:
            assert dead not in all_ids, f"Deactivated {dead} leaking into per-cursus listing"


# --- cours-andalus cleanup ---
class TestAndalusCleanup:
    def test_andalus_available_date_not_test_placeholder(self, session):
        r = session.get(f"{BASE_URL}/api/courses/cours-andalus", timeout=30)
        assert r.status_code == 200
        d = r.json()
        ad = d.get("available_date")
        assert ad is None or "TEST_" not in str(ad), f"cours-andalus.available_date polluted: {ad!r}"
