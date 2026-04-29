"""Backend tests for Iteration 32 — Sijill PILOT Maïmonide course resources.
Covers: /api/courses/{id}/resources, /resource-access-url, /files/r2-stream,
/files/r2-html, /audios/{id}/audio-access-url, gating on /api/audios + /api/courses/{id}.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://phased-launch-1.preview.emergentagent.com').rstrip('/')
COURSE_ID = 'cours-philo-juive'
EP01_AUDIO_ID = 'aud_cours-philo-juive-maimonide-ep01'
BIBLIO_KEY = 'cursus-f-nonarabe/24-philosophie-juive/maimonide/bibliographie_maimounide.pdf'
GLOSSAIRE_KEY = 'cursus-f-nonarabe/24-philosophie-juive/maimonide/glossaire-maimounide.pdf'
EP01_SCRIPT_KEY = 'cursus-f-nonarabe/24-philosophie-juive/maimonide/episode1_maimounide.pdf'
EP02_SCRIPT_KEY = 'cursus-f-nonarabe/24-philosophie-juive/maimonide/episode2_maimounide.pdf'
ADMIN_EMAIL = 'loubna.serrar@gmail.com'
ADMIN_PASSWORD = 'Admin123!'


@pytest.fixture(scope='session')
def api_session():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


@pytest.fixture(scope='session')
def admin_token(api_session):
    r = api_session.post(f'{BASE_URL}/api/auth/login',
                         json={'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f'Admin login failed: {r.status_code} {r.text[:200]}')
    return r.json()['token']


@pytest.fixture
def auth_headers(admin_token):
    return {'Authorization': f'Bearer {admin_token}'}


# ─── /api/courses/{id}/resources ────────────────────────────────────────────
class TestCourseResourcesList:
    def test_resources_unauth_401(self, api_session):
        r = requests.get(f'{BASE_URL}/api/courses/{COURSE_ID}/resources')
        assert r.status_code == 401

    def test_resources_subscriber_returns_4(self, api_session, auth_headers):
        r = requests.get(f'{BASE_URL}/api/courses/{COURSE_ID}/resources', headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert 'resources' in data
        assert data.get('count') == 4, f"expected 4 resources, got {data.get('count')}: {data}"
        items = data['resources']
        # All PDF mime
        for it in items:
            assert it.get('mime') == 'application/pdf', f"non-pdf mime in {it}"
        # 2 course-level (biblio + glossaire) + 2 episode-level (script ep01, ep02)
        course_scoped = [i for i in items if i.get('scope') == 'course']
        ep_scoped = [i for i in items if i.get('scope') == 'episode']
        assert len(course_scoped) == 2
        assert len(ep_scoped) == 2
        labels_course = {i['label'] for i in course_scoped}
        assert 'Bibliographie sélective' in labels_course
        assert 'Glossaire des termes' in labels_course
        ep_keys = {i['r2_key'] for i in ep_scoped}
        assert EP01_SCRIPT_KEY in ep_keys
        assert EP02_SCRIPT_KEY in ep_keys
        # episode-level items must include audio_id and episode_number
        for ei in ep_scoped:
            assert 'audio_id' in ei and 'episode_number' in ei


# ─── /api/courses/{id}/resource-access-url ──────────────────────────────────
class TestResourceAccessUrl:
    def test_unauth_401(self):
        r = requests.post(f'{BASE_URL}/api/courses/{COURSE_ID}/resource-access-url',
                          json={'r2_key': BIBLIO_KEY})
        assert r.status_code == 401

    def test_valid_key_returns_signed_url(self, auth_headers):
        r = requests.post(f'{BASE_URL}/api/courses/{COURSE_ID}/resource-access-url',
                          json={'r2_key': BIBLIO_KEY}, headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get('mime') == 'application/pdf'
        assert data.get('html_url') is None
        assert isinstance(data.get('url'), str) and '/api/files/r2-stream?t=' in data['url']
        assert data.get('expires_in') == 3600

    def test_invalid_key_404(self, auth_headers):
        r = requests.post(f'{BASE_URL}/api/courses/{COURSE_ID}/resource-access-url',
                          json={'r2_key': 'some/random/not-attached.pdf'}, headers=auth_headers)
        assert r.status_code == 404

    def test_missing_r2_key_400(self, auth_headers):
        r = requests.post(f'{BASE_URL}/api/courses/{COURSE_ID}/resource-access-url',
                          json={}, headers=auth_headers)
        assert r.status_code == 400


# ─── /api/files/r2-stream ───────────────────────────────────────────────────
class TestR2Stream:
    @pytest.fixture(scope='class')
    def signed_pdf_url(self, request):
        # Use the session-scoped admin_token
        token = request.getfixturevalue('admin_token')
        headers = {'Authorization': f'Bearer {token}'}
        r = requests.post(f'{BASE_URL}/api/courses/{COURSE_ID}/resource-access-url',
                          json={'r2_key': BIBLIO_KEY}, headers=headers)
        assert r.status_code == 200
        return r.json()['url']

    def test_stream_no_token_401(self):
        r = requests.get(f'{BASE_URL}/api/files/r2-stream')
        assert r.status_code == 401

    def test_stream_tampered_token_403(self):
        r = requests.get(f'{BASE_URL}/api/files/r2-stream?t=eyJabc.tampered.signature')
        assert r.status_code == 403

    def test_stream_valid_returns_pdf(self, signed_pdf_url):
        r = requests.get(signed_pdf_url, allow_redirects=False)
        # 200 if R2 file exists, 404/503 if missing/not-configured
        if r.status_code in (404, 503):
            pytest.skip(f"R2 file/config not available: {r.status_code}")
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get('content-type', '').startswith('application/pdf')
        assert r.headers.get('content-disposition') == 'inline'
        assert r.headers.get('accept-ranges') == 'bytes'
        # Body should look like a PDF
        assert r.content[:4] == b'%PDF', "body does not look like a PDF"

    def test_stream_head_method_supported(self, signed_pdf_url):
        r = requests.head(signed_pdf_url, allow_redirects=False)
        if r.status_code in (404, 503):
            pytest.skip(f"R2 file/config not available: {r.status_code}")
        assert r.status_code in (200, 206)

    def test_stream_range_request_206(self, signed_pdf_url):
        r = requests.get(signed_pdf_url, headers={'Range': 'bytes=0-99'})
        if r.status_code in (404, 503):
            pytest.skip(f"R2 file/config not available: {r.status_code}")
        assert r.status_code == 206


# ─── /api/files/r2-html (DOCX-only) ─────────────────────────────────────────
class TestR2Html:
    def test_html_with_pdf_token_400(self, auth_headers):
        r = requests.post(f'{BASE_URL}/api/courses/{COURSE_ID}/resource-access-url',
                          json={'r2_key': BIBLIO_KEY}, headers=auth_headers)
        assert r.status_code == 200
        url = r.json()['url']
        token = url.split('t=', 1)[1]
        r2 = requests.get(f'{BASE_URL}/api/files/r2-html?t={token}')
        # Token has scope=course_resource & mime=application/pdf -> handler returns 400
        assert r2.status_code == 400, r2.text[:200]

    def test_html_no_token_401(self):
        r = requests.get(f'{BASE_URL}/api/files/r2-html')
        assert r.status_code == 401


# ─── /api/audios/{id}/audio-access-url ──────────────────────────────────────
class TestEpisodeAudioAccessUrl:
    def test_unauth_401(self):
        r = requests.get(f'{BASE_URL}/api/audios/{EP01_AUDIO_ID}/audio-access-url')
        assert r.status_code == 401

    def test_subscriber_404_no_audio_uploaded(self, auth_headers):
        # has_r2_audio=False because .mp3 not uploaded yet
        r = requests.get(f'{BASE_URL}/api/audios/{EP01_AUDIO_ID}/audio-access-url',
                         headers=auth_headers)
        assert r.status_code == 404, r.text[:200]


# ─── Gating: /api/audios?course_id=... ─────────────────────────────────────
class TestAudioGating:
    def test_audios_anon_strips_protected(self, api_session):
        r = requests.get(f'{BASE_URL}/api/audios?course_id={COURSE_ID}')
        assert r.status_code == 200
        audios = r.json()
        assert isinstance(audios, list) and len(audios) > 0
        for a in audios:
            assert 'youtube_url' not in a, f"youtube_url leaked anon: {a.get('id')}"
            assert 'r2_audio_key' not in a, f"r2_audio_key leaked anon: {a.get('id')}"
            assert 'r2_video_key' not in a, f"r2_video_key leaked anon: {a.get('id')}"
            assert 'episode_resources' not in a, f"episode_resources leaked anon: {a.get('id')}"

    def test_audios_subscriber_exposes_all(self, auth_headers):
        r = requests.get(f'{BASE_URL}/api/audios?course_id={COURSE_ID}', headers=auth_headers)
        assert r.status_code == 200
        audios = r.json()
        # Find a Maïmonide ep audio
        target = next((a for a in audios if a.get('id') == EP01_AUDIO_ID), None)
        assert target is not None, "ep01 audio not in list"
        # Must contain new fields
        assert 'r2_video_key' in target
        assert 'r2_audio_key' in target
        assert 'episode_resources' in target
        assert isinstance(target['episode_resources'], list) and len(target['episode_resources']) >= 1
        assert 'has_r2_audio' in target
        assert target['has_r2_audio'] is False  # .mp3 not uploaded yet


# ─── Gating: /api/courses/{id} ──────────────────────────────────────────────
class TestCourseGating:
    def test_course_anon_strips_protected(self):
        r = requests.get(f'{BASE_URL}/api/courses/{COURSE_ID}')
        assert r.status_code == 200
        c = r.json()
        assert 'youtube_url' not in c, "youtube_url leaked anon"
        assert 'course_resources' not in c, "course_resources leaked anon"

    def test_course_subscriber_has_resources(self, auth_headers):
        r = requests.get(f'{BASE_URL}/api/courses/{COURSE_ID}', headers=auth_headers)
        assert r.status_code == 200
        c = r.json()
        cr = c.get('course_resources')
        assert isinstance(cr, list), f"course_resources missing: keys={list(c.keys())}"
        assert len(cr) == 2
        labels = {x.get('label') for x in cr}
        assert labels == {'Bibliographie sélective', 'Glossaire des termes'}
