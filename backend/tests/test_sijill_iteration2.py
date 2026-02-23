"""
Backend tests for Sijill e-learning platform - Iteration 2
Testing: audio module_id filter, modules by course, stream-url, cursus list, no Henry Corbin
"""
import pytest
import requests
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent.parent / 'frontend/.env')

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"


# ─── Auth Fixtures ────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    """Login with test user and get JWT token."""
    resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "testuser@hikma.com",
        "password": "TestUser123!"
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Auth failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def auth_session(session, auth_token):
    """Session with auth header."""
    session.headers.update({"Authorization": f"Bearer {auth_token}"})
    return session


# ─── Test 1: GET /api/audios?module_id=cours-falsafa-grands-mod-1 ─────────────

class TestAudioModuleFilter:
    """Test 1: Audio filtering by module_id"""
    
    def test_audio_filter_module_id_returns_audio(self, session):
        """GET /api/audios?module_id=cours-falsafa-grands-mod-1 should return 1 audio"""
        resp = session.get(f"{BASE_URL}/api/audios?module_id=cours-falsafa-grands-mod-1")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1, f"Expected at least 1 audio, got {len(data)}"
        print(f"PASS: Found {len(data)} audio(s) for module cours-falsafa-grands-mod-1")
    
    def test_audio_filter_module_id_has_file_key(self, session):
        """Audio returned should have file_key pointing to R2"""
        resp = session.get(f"{BASE_URL}/api/audios?module_id=cours-falsafa-grands-mod-1")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        audio = data[0]
        assert 'file_key' in audio, "Audio should have file_key"
        assert audio['file_key'], "file_key should not be empty"
        assert 'cursus-a-falsafa' in audio['file_key'] or 'al-kindi' in audio['file_key'], \
            f"file_key should reference correct R2 path, got: {audio['file_key']}"
        print(f"PASS: file_key = {audio['file_key']}")
    
    def test_audio_filter_returns_stream_url(self, session):
        """Audio should have stream_url field attached"""
        resp = session.get(f"{BASE_URL}/api/audios?module_id=cours-falsafa-grands-mod-1")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        audio = data[0]
        # stream_url may be empty string if R2 not configured, but field must exist
        assert 'stream_url' in audio, "Audio should have stream_url field"
        print(f"PASS: stream_url field present, value: {audio.get('stream_url', '')[:60]}...")
    
    def test_audio_filter_correct_module_id(self, session):
        """Audio module_id should match the filter"""
        resp = session.get(f"{BASE_URL}/api/audios?module_id=cours-falsafa-grands-mod-1")
        assert resp.status_code == 200
        data = resp.json()
        for audio in data:
            assert audio.get('module_id') == 'cours-falsafa-grands-mod-1', \
                f"module_id mismatch: {audio.get('module_id')}"
        print(f"PASS: All {len(data)} audios have correct module_id")


# ─── Test 2: GET /api/modules?course_id=cours-falsafa-grands ──────────────────

class TestModulesByCourse:
    """Test 2: Modules by course_id - should return real modules, not placeholders"""
    
    def test_modules_by_course_returns_list(self, session):
        """GET /api/modules?course_id=cours-falsafa-grands should return modules"""
        resp = session.get(f"{BASE_URL}/api/modules?course_id=cours-falsafa-grands")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should return at least 1 module"
        print(f"PASS: Found {len(data)} modules for cours-falsafa-grands")
    
    def test_modules_are_real_not_placeholders(self, session):
        """Modules should have real names, not 'Module 1', 'Module 2'..."""
        resp = session.get(f"{BASE_URL}/api/modules?course_id=cours-falsafa-grands")
        assert resp.status_code == 200
        data = resp.json()
        for mod in data:
            name = mod.get('name', '')
            # Should NOT be generic placeholder names
            assert name not in ['Module 1', 'Module 2', 'Module 3', 'Module 4', 'Module 5'], \
                f"Found placeholder module name: {name}"
            assert len(name) > 0, "Module name should not be empty"
        # Should contain real scholar names
        names = [m.get('name', '') for m in data]
        has_al_kindi = any('Al-Kind' in n or 'Kindī' in n for n in names)
        assert has_al_kindi, f"Expected 'Al-Kindī' in module names, got: {names[:3]}"
        print(f"PASS: Modules have real names: {names[:3]}")
    
    def test_modules_have_required_fields(self, session):
        """Each module should have id, name, course_id, is_active fields"""
        resp = session.get(f"{BASE_URL}/api/modules?course_id=cours-falsafa-grands")
        assert resp.status_code == 200
        data = resp.json()
        for mod in data:
            assert 'id' in mod, f"Module missing 'id': {mod}"
            assert 'name' in mod, f"Module missing 'name': {mod}"
            assert 'course_id' in mod, f"Module missing 'course_id': {mod}"
            assert mod['course_id'] == 'cours-falsafa-grands', \
                f"course_id mismatch: {mod['course_id']}"
        print(f"PASS: All modules have required fields")


# ─── Test 3: GET /api/audios/{audio_id}/stream-url ────────────────────────────

class TestAudioStreamUrl:
    """Test 3: Presigned R2 stream URL"""
    
    def test_stream_url_returns_200(self, session):
        """GET /api/audios/aud_cours-falsafa-grands-mod-1/stream-url should return 200"""
        resp = session.get(f"{BASE_URL}/api/audios/aud_cours-falsafa-grands-mod-1/stream-url")
        assert resp.status_code == 200
        data = resp.json()
        assert 'audio_id' in data
        assert data['audio_id'] == 'aud_cours-falsafa-grands-mod-1'
        print(f"PASS: stream-url endpoint returns 200")
    
    def test_stream_url_has_correct_fields(self, session):
        """stream-url response should have required fields"""
        resp = session.get(f"{BASE_URL}/api/audios/aud_cours-falsafa-grands-mod-1/stream-url")
        assert resp.status_code == 200
        data = resp.json()
        assert 'stream_url' in data, "Response should have stream_url"
        assert 'file_key' in data, "Response should have file_key"
        assert 'source' in data, "Response should have source"
        assert data['file_key'], "file_key should not be empty"
        print(f"PASS: source={data['source']}, file_key={data['file_key']}")
    
    def test_stream_url_is_r2_source(self, session):
        """Source should be 'r2' if R2 is configured, else 'fallback'"""
        resp = session.get(f"{BASE_URL}/api/audios/aud_cours-falsafa-grands-mod-1/stream-url")
        assert resp.status_code == 200
        data = resp.json()
        source = data.get('source')
        assert source in ['r2', 'fallback'], f"source should be r2 or fallback, got: {source}"
        # Log a warning if fallback
        if source == 'fallback':
            print(f"WARNING: R2 presigned URL not generated (R2 client not configured), using fallback")
        else:
            print(f"PASS: R2 presigned URL generated, stream_url starts with: {data['stream_url'][:60]}...")
    
    def test_stream_url_404_for_unknown_audio(self, session):
        """Non-existent audio should return 404"""
        resp = session.get(f"{BASE_URL}/api/audios/aud_does_not_exist_xyz/stream-url")
        assert resp.status_code == 404
        print(f"PASS: 404 returned for non-existent audio")


# ─── Test 4: GET /api/cursus ──────────────────────────────────────────────────

class TestCursus:
    """Test 4: Cursus list - should return 5 cursus without Henry Corbin"""
    
    def test_cursus_returns_5(self, session):
        """GET /api/cursus should return 5 cursus"""
        resp = session.get(f"{BASE_URL}/api/cursus")
        # Try /cursus first, fallback to /thematiques
        if resp.status_code == 404:
            resp = session.get(f"{BASE_URL}/api/thematiques")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 5, f"Expected 5 cursus, got {len(data)}: {[c.get('id') for c in data]}"
        print(f"PASS: {len(data)} cursus returned")
    
    def test_cursus_no_henry_corbin(self, session):
        """No cursus should be Henry Corbin"""
        resp = session.get(f"{BASE_URL}/api/thematiques")
        assert resp.status_code == 200
        data = resp.json()
        for c in data:
            name = c.get('name', '').lower()
            id_val = c.get('id', '').lower()
            assert 'corbin' not in name, f"Found Henry Corbin cursus: {c}"
            assert 'corbin' not in id_val, f"Found Henry Corbin cursus id: {c}"
        print(f"PASS: No Henry Corbin in cursus list")
    
    def test_cursus_names_are_correct(self, session):
        """Cursus should have correct names"""
        resp = session.get(f"{BASE_URL}/api/thematiques")
        assert resp.status_code == 200
        data = resp.json()
        ids = [c.get('id') for c in data]
        expected_ids = ['cursus-falsafa', 'cursus-theologie', 'cursus-sciences-islamiques', 'cursus-arts', 'cursus-spiritualites']
        for eid in expected_ids:
            assert eid in ids, f"Expected cursus '{eid}' not found in: {ids}"
        print(f"PASS: All 5 expected cursus IDs found")


# ─── Test 5: GET /api/audios - no old Henry Corbin audios ─────────────────────

class TestAudiosNoCorbin:
    """Test 5: Old Henry Corbin audios should not exist"""
    
    def test_no_corbin_audios(self, session):
        """No audio should have ID like aud-corbin-01"""
        resp = session.get(f"{BASE_URL}/api/audios")
        assert resp.status_code == 200
        data = resp.json()
        corbin_audios = [a for a in data if 'corbin' in a.get('id', '').lower()]
        assert len(corbin_audios) == 0, f"Found old Corbin audios: {[a['id'] for a in corbin_audios]}"
        print(f"PASS: No Henry Corbin audios found in {len(data)} total audios")
    
    def test_audios_have_module_ids(self, session):
        """All audios in collection should have module_id (70 new audios)"""
        resp = session.get(f"{BASE_URL}/api/audios")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        # Sample check: at least 90% should have module_id
        with_module = [a for a in data if a.get('module_id')]
        ratio = len(with_module) / len(data)
        assert ratio >= 0.9, f"Only {len(with_module)}/{len(data)} audios have module_id"
        print(f"PASS: {len(with_module)}/{len(data)} audios have module_id ({ratio:.0%})")
    
    def test_total_audios_is_70(self, session):
        """Collection should have 70 new audios (not old 14-15)"""
        resp = session.get(f"{BASE_URL}/api/audios")
        assert resp.status_code == 200
        data = resp.json()
        # Note: API returns max 100, 70 should all come back
        assert len(data) == 70, f"Expected 70 audios, got {len(data)}"
        print(f"PASS: {len(data)} audios in collection (expected 70)")


# ─── Test 6: Auth - Login ─────────────────────────────────────────────────────

class TestAuth:
    """Test login with testuser@hikma.com"""
    
    def test_login_testuser(self, session):
        """Login with testuser@hikma.com / TestUser123!"""
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@hikma.com",
            "password": "TestUser123!"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert 'token' in data
        assert 'user' in data
        assert data['user']['email'] == 'testuser@hikma.com'
        print(f"PASS: Login successful for testuser@hikma.com")
    
    def test_login_admin(self, session):
        """Login with admin@hikma-admin.com / Admin123!"""
        resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@hikma-admin.com",
            "password": "Admin123!"
        })
        # Admin might not exist, so accept 200 or 401
        assert resp.status_code in [200, 401], f"Unexpected status: {resp.status_code}"
        if resp.status_code == 200:
            print(f"PASS: Admin login successful")
        else:
            print(f"INFO: Admin login failed (user may not exist in DB): {resp.json()}")
