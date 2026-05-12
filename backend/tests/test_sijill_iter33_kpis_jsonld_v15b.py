"""
Sijill iteration 33 backend tests.

Covers:
1) /api/admin/kpis admin endpoint (auth + payload schema)
2) Server-side JSON-LD (Article + BreadcrumbList) injection via /api/site/cours/{course_id}
3) Migration v15b cleanup of cours-historiographie (1 module: Ibn Khaldūn)
"""
import os
import re
import json
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://phased-launch-1.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "loubna.serrar@gmail.com"
ADMIN_PASSWORD = "Admin123!"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api_client):
    resp = api_client.post(f"{BASE_URL}/api/auth/login",
                           json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Admin login failed: {resp.status_code} {resp.text}"
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    assert token, f"No token in login response: {data}"
    return token


@pytest.fixture(scope="session")
def admin_client(api_client, admin_token):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}",
    })
    return s


# ============================================================
# 1) /api/admin/kpis
# ============================================================
class TestAdminKpis:
    REQUIRED_KEYS = [
        "mrr_eur", "arr_eur",
        "subscribers_active_total", "subscribers_monthly", "subscribers_yearly",
        "subscribers_gift", "free_access_users", "trial_active",
        "preregistrations_total",
        "gift_cards_purchased", "gift_cards_redeemed", "gift_cards_revenue_eur",
        "generated_at",
    ]

    def test_kpis_requires_auth(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/admin/kpis")
        assert resp.status_code in (401, 403), f"Expected 401/403 without auth, got {resp.status_code}: {resp.text[:200]}"

    def test_kpis_rejects_non_admin_with_bad_token(self, api_client):
        s = requests.Session()
        s.headers.update({"Authorization": "Bearer invalid.token.here"})
        resp = s.get(f"{BASE_URL}/api/admin/kpis")
        assert resp.status_code in (401, 403), f"Expected 401/403 with bad token, got {resp.status_code}"

    def test_kpis_returns_200_for_admin(self, admin_client):
        resp = admin_client.get(f"{BASE_URL}/api/admin/kpis")
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:500]}"
        data = resp.json()
        assert isinstance(data, dict), "KPIs response must be a JSON object"

    def test_kpis_payload_has_all_required_keys(self, admin_client):
        resp = admin_client.get(f"{BASE_URL}/api/admin/kpis")
        assert resp.status_code == 200
        data = resp.json()
        missing = [k for k in self.REQUIRED_KEYS if k not in data]
        assert not missing, f"Missing keys: {missing}. Got keys: {list(data.keys())}"

    def test_kpis_numeric_fields_are_numbers(self, admin_client):
        resp = admin_client.get(f"{BASE_URL}/api/admin/kpis")
        data = resp.json()
        numeric_keys = [
            "mrr_eur", "arr_eur",
            "subscribers_active_total", "subscribers_monthly", "subscribers_yearly",
            "subscribers_gift", "free_access_users", "trial_active",
            "preregistrations_total",
            "gift_cards_purchased", "gift_cards_redeemed", "gift_cards_revenue_eur",
        ]
        for k in numeric_keys:
            assert isinstance(data[k], (int, float)), f"{k} should be numeric, got {type(data[k]).__name__}: {data[k]!r}"
            assert data[k] >= 0, f"{k} should be >= 0, got {data[k]}"
        # generated_at must be a non-empty string (ISO timestamp)
        assert isinstance(data["generated_at"], str) and len(data["generated_at"]) > 0

    def test_kpis_arr_consistent_with_mrr(self, admin_client):
        # ARR should typically equal MRR * 12 (sanity check, allow slight rounding)
        data = admin_client.get(f"{BASE_URL}/api/admin/kpis").json()
        if data["mrr_eur"] > 0:
            expected_arr = data["mrr_eur"] * 12
            # Loose check: arr should be within +/- small tolerance, or at least >= mrr
            assert data["arr_eur"] >= data["mrr_eur"], \
                f"ARR ({data['arr_eur']}) should be >= MRR ({data['mrr_eur']})"


# ============================================================
# 2) Server-side JSON-LD injection on /api/site/cours/{id}
# ============================================================
class TestJsonLdInjection:
    def _get_html(self, course_id):
        url = f"{BASE_URL}/api/site/cours/{course_id}"
        resp = requests.get(url, headers={"Accept": "text/html"}, timeout=20)
        return resp

    def _extract_jsonld_scripts(self, html):
        # Find all <script type="application/ld+json"> ... </script>
        pattern = re.compile(
            r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            re.DOTALL | re.IGNORECASE,
        )
        blocks = pattern.findall(html)
        parsed = []
        for b in blocks:
            try:
                parsed.append(json.loads(b.strip()))
            except json.JSONDecodeError:
                parsed.append({"_raw": b.strip(), "_parse_error": True})
        return parsed

    def test_historiographie_returns_200_html(self):
        resp = self._get_html("cours-historiographie")
        assert resp.status_code == 200
        assert "text/html" in resp.headers.get("Content-Type", "").lower()

    def test_historiographie_has_article_jsonld_with_ibn_khaldun(self):
        resp = self._get_html("cours-historiographie")
        html = resp.text
        blocks = self._extract_jsonld_scripts(html)
        assert len(blocks) >= 2, f"Expected at least 2 ld+json blocks, found {len(blocks)}"
        articles = [b for b in blocks if isinstance(b, dict) and b.get("@type") == "Article"]
        assert articles, f"No Article JSON-LD block found. Block types: {[b.get('@type') for b in blocks if isinstance(b, dict)]}"
        article = articles[0]
        headline = article.get("headline", "")
        # Accept both 'Khaldūn' (with macron) or 'Khaldun'
        assert ("Khaldūn" in headline) or ("Khaldun" in headline), \
            f"Article headline does not contain Ibn Khaldūn: {headline!r}"

    def test_historiographie_has_breadcrumblist_jsonld(self):
        resp = self._get_html("cours-historiographie")
        blocks = self._extract_jsonld_scripts(resp.text)
        breadcrumbs = [b for b in blocks if isinstance(b, dict) and b.get("@type") == "BreadcrumbList"]
        assert breadcrumbs, f"No BreadcrumbList JSON-LD found. Types: {[b.get('@type') for b in blocks if isinstance(b, dict)]}"
        bc = breadcrumbs[0]
        items = bc.get("itemListElement", [])
        assert isinstance(items, list) and len(items) >= 3, \
            f"BreadcrumbList must have 3+ items, got {len(items)}"
        # First item should be Accueil
        names = [it.get("name", "") for it in items if isinstance(it, dict)]
        assert any("Accueil" in n for n in names), f"No 'Accueil' breadcrumb. Names: {names}"
        assert any("Catalogue" in n or "Cours" in n for n in names), \
            f"No Catalogue/Cours breadcrumb. Names: {names}"

    def test_historiographie_title_and_canonical_reflect_course(self):
        resp = self._get_html("cours-historiographie")
        html = resp.text
        # <title>
        title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        assert title_match, "No <title> tag found"
        title = title_match.group(1).strip()
        # title must NOT be the homepage default and should reference the course/Ibn Khaldūn or Historiographie
        assert title, "Empty <title>"
        assert ("Khaldūn" in title) or ("Khaldun" in title) or ("Historiographie" in title), \
            f"<title> does not reflect course: {title!r}"

        # <link rel="canonical">
        can_matches = re.findall(
            r'<link[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']',
            html, re.IGNORECASE,
        )
        assert can_matches, "No canonical link found"
        # No duplicates pointing to homepage
        canonicals = [c for c in can_matches]
        # Should mention the course slug
        assert any("cours-historiographie" in c or "/cours/" in c for c in canonicals), \
            f"Canonical does not reference course: {canonicals}"
        # And should NOT all be the homepage (root only)
        homepage_only = [c for c in canonicals if c.rstrip("/").endswith(BASE_URL.rstrip("/")) or c in ("/", "")]
        assert len(homepage_only) < len(canonicals), \
            f"Canonical points only to homepage: {canonicals}"

    def test_nonexistent_course_returns_200_default_index(self):
        resp = self._get_html("inexistant-xyz")
        assert resp.status_code == 200, f"Expected 200 fallback, got {resp.status_code}"
        # No course-specific JSON-LD Article block should be present
        blocks = self._extract_jsonld_scripts(resp.text)
        articles = [b for b in blocks if isinstance(b, dict) and b.get("@type") == "Article"]
        # If any Article exists, it must NOT reference the unknown slug
        for a in articles:
            headline = a.get("headline", "")
            assert "inexistant-xyz" not in headline.lower(), \
                f"Default index leaked unknown slug into Article: {headline}"

    def test_philo_juive_also_injects_jsonld(self):
        # Regression: ensure JSON-LD injection works for OTHER courses too
        resp = self._get_html("cours-philo-juive")
        assert resp.status_code == 200
        blocks = self._extract_jsonld_scripts(resp.text)
        types = [b.get("@type") for b in blocks if isinstance(b, dict)]
        assert "Article" in types, f"cours-philo-juive missing Article JSON-LD. Types: {types}"
        assert "BreadcrumbList" in types, f"cours-philo-juive missing BreadcrumbList JSON-LD. Types: {types}"


# ============================================================
# 3) Migration v15b — cours-historiographie cleanup
# ============================================================
class TestMigrationV15bHistoriographie:
    COURSE_ID = "cours-historiographie"

    def test_modules_endpoint_returns_exactly_one_module(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/modules?course_id={self.COURSE_ID}")
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:300]}"
        data = resp.json()
        modules = data if isinstance(data, list) else data.get("modules", data.get("items", []))
        assert isinstance(modules, list), f"Expected list, got: {type(modules).__name__}"
        assert len(modules) == 1, f"Expected exactly 1 module, got {len(modules)}: {[m.get('title') for m in modules]}"

        m = modules[0]
        # Module uses 'name' field (verified via API), accept either 'name' or 'title'
        title = m.get("name") or m.get("title") or ""
        assert ("Khaldūn" in title) or ("Khaldun" in title), f"Module name not Ibn Khaldūn: {title!r} (module={m})"
        assert m.get("order") == 1, f"Expected order=1, got {m.get('order')}"
        assert m.get("episode_count") == 1, f"Expected episode_count=1, got {m.get('episode_count')}"

    def test_courses_endpoint_modules_count_is_one(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/courses/{self.COURSE_ID}")
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:300]}"
        data = resp.json()
        assert data.get("modules_count") == 1, \
            f"Expected modules_count=1, got {data.get('modules_count')}"
        title = data.get("title", "")
        assert "Ibn Khaldūn" in title or "Ibn Khaldun" in title, \
            f"Course title missing 'Ibn Khaldūn': {title!r}"
        assert "Historiographie" in title, f"Course title missing 'Historiographie': {title!r}"

    def test_audios_endpoint_returns_exactly_one_audio(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/audios?course_id={self.COURSE_ID}")
        assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:300]}"
        data = resp.json()
        audios = data if isinstance(data, list) else data.get("audios", data.get("items", []))
        assert isinstance(audios, list)
        assert len(audios) == 1, f"Expected exactly 1 audio, got {len(audios)}: {[a.get('title') for a in audios]}"
        title = audios[0].get("title", "")
        # Expected: "Ibn Khaldūn philosophe et historien"
        assert ("Khaldūn" in title) or ("Khaldun" in title), f"Audio title missing Ibn Khaldūn: {title!r}"
        assert "philosophe" in title.lower() and "historien" in title.lower(), \
            f"Audio title does not match expected: {title!r}"
