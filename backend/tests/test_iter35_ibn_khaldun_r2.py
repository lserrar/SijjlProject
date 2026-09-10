"""
Iteration 35: Tests for Ibn Khaldun (falsafa / inclassables) R2 sync fix.
Verifies:
  1. Course r2_prefix corrected to cursus-a-falsafa/inclassables/ibn-khaldun-philosophie/
  2. /resources exposes bibliographie + 2 scripts (Contexte intentionally excluded)
  3. Audio docs have valid r2_key pointing to Falsafa-ibnKhaldune-episode{1,2}.m4a
  4. /audios/{id}/stream-url returns a proxy signed stream URL (non-empty)
  5. Bibliography DOCX label is the dynamic real title (not fallback fr string)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://phased-launch-1.preview.emergentagent.com").rstrip("/")
COURSE_SLUG = "cours-falsafa-inclassables"
EMAIL = "loubna.serrar@gmail.com"
PASSWORD = "Admin123!"
EXPECTED_R2_PREFIX = "cursus-a-falsafa/inclassables/ibn-khaldun-philosophie/"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("token")
    assert token, "No token in login response"
    api.headers.update({"Authorization": f"Bearer {token}"})
    return token


# ─── 1. Course r2_prefix ──────────────────────────────────────────────────────
def test_course_has_correct_r2_prefix(api):
    r = api.get(f"{BASE_URL}/api/courses/{COURSE_SLUG}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("r2_prefix") == EXPECTED_R2_PREFIX, \
        f"Expected r2_prefix={EXPECTED_R2_PREFIX}, got {data.get('r2_prefix')}"


# ─── 2. /resources ────────────────────────────────────────────────────────────
def test_resources_contains_scripts_and_biblio(api, auth):
    r = api.get(f"{BASE_URL}/api/courses/{COURSE_SLUG}/resources")
    assert r.status_code == 200, r.text
    data = r.json()
    items = data.get("resources", [])
    keys = [it.get("r2_key", "").lower() for it in items]
    joined = " | ".join(keys)

    assert any("bibliographie_ibnkhaldune.docx" in k for k in keys), \
        f"Missing bibliographie_ibnkhaldune.docx in {keys}"
    assert any("script-ibnkhaldune-episode1.docx" in k for k in keys), \
        f"Missing script episode1 in {keys}"
    assert any("script-ibnkhaldune-episode2.docx" in k for k in keys), \
        f"Missing script episode2 in {keys}"
    # Note: Contexte_*.docx is intentionally excluded from /resources
    # (surfaced elsewhere as article content) — see server.py:7731.
    print(f"/resources items: {len(items)}")


def test_biblio_title_is_dynamic(api, auth):
    """Bibliography label should be the real title extracted from the DOCX,
    not the generic fallback 'Bibliographie sélective'."""
    r = api.get(f"{BASE_URL}/api/courses/{COURSE_SLUG}/resources")
    assert r.status_code == 200
    biblio = None
    for it in r.json().get("resources", []):
        if it.get("r2_key", "").endswith("bibliographie_ibnkhaldune.docx"):
            biblio = it
            break
    assert biblio is not None, "Course-level bibliographie_ibnkhaldune.docx not found"
    label = biblio.get("label") or ""
    print(f"Biblio label: {label!r}")
    # Test intent per review: dynamic title from DOCX, not fallback
    assert label.strip().lower() != "bibliographie sélective", \
        f"Biblio label still uses generic fallback: {label!r}. Expected dynamic title extracted from DOCX."


# ─── 3. Audio episodes r2_key ─────────────────────────────────────────────────
def test_audio_episodes_have_r2_key(api):
    r = api.get(f"{BASE_URL}/api/audios", params={"course_id": COURSE_SLUG})
    assert r.status_code == 200, r.text
    audios = r.json()
    assert isinstance(audios, list) and len(audios) >= 2, f"Got {len(audios)} audios"
    by_ep = {a.get("episode_number"): a for a in audios}
    assert 1 in by_ep and 2 in by_ep, f"Missing ep1/ep2: {list(by_ep.keys())}"
    assert (by_ep[1].get("r2_key") or "").endswith("Falsafa-ibnKhaldune-episode1.m4a"), \
        f"ep1 r2_key wrong: {by_ep[1].get('r2_key')}"
    assert (by_ep[2].get("r2_key") or "").endswith("Falsafa-ibnKhaldune-episode2.m4a"), \
        f"ep2 r2_key wrong: {by_ep[2].get('r2_key')}"


# ─── 4. Streaming signed URL ──────────────────────────────────────────────────
@pytest.mark.parametrize("audio_id", [
    "aud_cours-falsafa-inclassables-main-ep01",
    "aud_cours-falsafa-inclassables-main-ep02",
])
def test_audio_stream_url(api, auth, audio_id):
    r = api.get(f"{BASE_URL}/api/audios/{audio_id}/stream-url")
    assert r.status_code == 200, f"{audio_id}: {r.status_code} {r.text}"
    body = r.json()
    stream_url = body.get("stream_url") or ""
    file_key = body.get("file_key")
    source = body.get("source")
    print(f"{audio_id} → stream_url={stream_url!r} file_key={file_key!r} source={source}")
    assert stream_url, f"{audio_id}: empty stream_url (file_key={file_key}, source={source})"
    assert source == "proxy", f"{audio_id}: expected source='proxy', got {source!r}"
    assert file_key, f"{audio_id}: file_key is empty"


# ─── 5. Actual streaming bytes ────────────────────────────────────────────────
@pytest.mark.parametrize("audio_id", [
    "aud_cours-falsafa-inclassables-main-ep01",
    "aud_cours-falsafa-inclassables-main-ep02",
])
def test_audio_stream_bytes(api, auth, audio_id):
    r = api.get(f"{BASE_URL}/api/audios/{audio_id}/stream-url")
    assert r.status_code == 200
    stream_url = r.json().get("stream_url") or ""
    assert stream_url
    # stream_url may be relative; make absolute
    if stream_url.startswith("/"):
        stream_url = BASE_URL + stream_url
    # Range header to avoid downloading whole file
    r2 = api.get(stream_url, headers={"Range": "bytes=0-1023"}, stream=True, allow_redirects=True)
    print(f"{audio_id}: stream status={r2.status_code} ct={r2.headers.get('content-type')}")
    assert r2.status_code in (200, 206), f"{audio_id}: stream returned {r2.status_code} {r2.text[:300]}"
    ct = (r2.headers.get("content-type") or "").lower()
    assert "audio" in ct or "mp4" in ct or "octet-stream" in ct, f"unexpected content-type {ct!r}"


# ─── 6. Regression: other courses still have dynamic biblio titles ────────────
def test_alkindi_biblio_dynamic(api, auth):
    r = api.get(f"{BASE_URL}/api/courses/cours-al-kindi/resources")
    assert r.status_code == 200, r.text
    labels = [it.get("label", "") for it in r.json().get("resources", []) if "biblio" in (it.get("r2_key") or "").lower()]
    print(f"Al-Kindi biblio labels: {labels}")
    assert labels, "No biblio found for cours-al-kindi"
    # At least one biblio should have a real/dynamic label (not the generic fallback)
    assert any(l.strip().lower() != "bibliographie sélective" for l in labels), \
        f"All Al-Kindi biblio labels are generic fallback: {labels}"
