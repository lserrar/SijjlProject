"""
Iteration 9: Tests for:
1. /courses/{id}/playlist endpoint - falsafa-grands (5 épisodes)
2. /courses/{id}/playlist endpoint - cours-kalam (4 épisodes)
3. Playlist structure validation (audio_id, module_name, stream_url)
4. Navigation URL structure validation (audio player route)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    import subprocess
    result = subprocess.run(['grep', 'EXPO_PUBLIC_BACKEND_URL', '/app/frontend/.env'], capture_output=True, text=True)
    BASE_URL = result.stdout.strip().split('=', 1)[-1].strip()


class TestPlaylistEndpoints:
    """Test GET /courses/{id}/playlist endpoint"""

    def test_falsafa_grands_playlist_returns_200(self):
        """GET /api/courses/cours-falsafa-grands/playlist → 200"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-falsafa-grands/playlist")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_falsafa_grands_playlist_has_episodes(self):
        """Playlist must have at least 1 episode"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-falsafa-grands/playlist")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), "Playlist should be a list"
        assert len(data) > 0, "Playlist should not be empty"

    def test_falsafa_grands_playlist_episode_count(self):
        """Playlist should return exactly 5 episodes"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-falsafa-grands/playlist")
        data = resp.json()
        assert len(data) == 5, f"Expected 5 episodes, got {len(data)}"

    def test_falsafa_grands_playlist_first_episode_audio_id(self):
        """First episode audio_id must be aud_cours-falsafa-grands-mod-1"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-falsafa-grands/playlist")
        data = resp.json()
        assert data[0]['audio_id'] == 'aud_cours-falsafa-grands-mod-1', \
            f"Expected aud_cours-falsafa-grands-mod-1, got {data[0].get('audio_id')}"

    def test_falsafa_grands_playlist_has_required_fields(self):
        """Each playlist item must have audio_id, module_name, stream_url"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-falsafa-grands/playlist")
        data = resp.json()
        for ep in data:
            assert 'audio_id' in ep, f"Missing audio_id in episode: {ep}"
            assert 'module_name' in ep, f"Missing module_name in episode: {ep}"
            assert 'stream_url' in ep, f"Missing stream_url in episode: {ep}"
            assert ep['audio_id'], "audio_id must not be empty"
            assert ep['module_name'], "module_name must not be empty"

    def test_falsafa_grands_playlist_stream_url_is_proxy(self):
        """stream_url must be a proxy URL (not R2 presigned)"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-falsafa-grands/playlist")
        data = resp.json()
        for ep in data:
            stream_url = ep.get('stream_url', '')
            assert stream_url.startswith('https://'), f"stream_url should start with https: {stream_url}"
            assert '/api/audios/' in stream_url, f"stream_url should be a proxy URL: {stream_url}"

    def test_falsafa_grands_playlist_ordered(self):
        """Episodes should be in module order (order field ascending)"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-falsafa-grands/playlist")
        data = resp.json()
        orders = [ep.get('module_order', 0) for ep in data]
        assert orders == sorted(orders), f"Playlist not in order: {orders}"

    def test_falsafa_grands_playlist_has_module_name(self):
        """First episode module name should contain 'Al-Kindī'"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-falsafa-grands/playlist")
        data = resp.json()
        first_module_name = data[0].get('module_name', '')
        assert 'Al-Kindī' in first_module_name or 'Al-Kind' in first_module_name, \
            f"Expected Al-Kindī in first module name, got: {first_module_name}"

    def test_kalam_playlist_returns_200(self):
        """GET /api/courses/cours-kalam/playlist → 200"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-kalam/playlist")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_kalam_playlist_episode_count(self):
        """Kalam playlist should return 4 episodes"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-kalam/playlist")
        data = resp.json()
        assert len(data) == 4, f"Expected 4 episodes for cours-kalam, got {len(data)}"

    def test_kalam_playlist_has_required_fields(self):
        """Kalam playlist items must have audio_id, module_name, stream_url"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-kalam/playlist")
        data = resp.json()
        for ep in data:
            assert 'audio_id' in ep, f"Missing audio_id"
            assert 'module_name' in ep, f"Missing module_name"
            assert 'stream_url' in ep, f"Missing stream_url"

    def test_kalam_playlist_stream_urls_are_proxy(self):
        """Kalam stream URLs should be proxy URLs"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-kalam/playlist")
        data = resp.json()
        for ep in data:
            url = ep.get('stream_url', '')
            assert '/api/audios/' in url, f"Not a proxy URL: {url}"

    def test_nonexistent_course_playlist_returns_empty(self):
        """Playlist for non-existent course should return empty list (not 404)"""
        resp = requests.get(f"{BASE_URL}/api/courses/nonexistent-course-xyz/playlist")
        assert resp.status_code == 200, f"Expected 200 (empty list), got {resp.status_code}"
        data = resp.json()
        assert data == [], f"Expected empty list, got: {data}"


class TestAudioEndpointForPlaylist:
    """Validate audio detail endpoint used by the audio player screen"""

    def test_first_falsafa_audio_returns_200(self):
        """GET /api/audios/aud_cours-falsafa-grands-mod-1 → 200"""
        resp = requests.get(f"{BASE_URL}/api/audios/aud_cours-falsafa-grands-mod-1")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"

    def test_first_falsafa_audio_has_stream_url(self):
        """Audio doc should have stream_url"""
        resp = requests.get(f"{BASE_URL}/api/audios/aud_cours-falsafa-grands-mod-1")
        data = resp.json()
        assert 'stream_url' in data, "Missing stream_url in audio response"
        assert data['stream_url'].startswith('https://'), f"Invalid stream_url: {data['stream_url']}"

    def test_first_falsafa_audio_has_module_id(self):
        """Audio doc should have module_id linking to the module"""
        resp = requests.get(f"{BASE_URL}/api/audios/aud_cours-falsafa-grands-mod-1")
        data = resp.json()
        assert 'module_id' in data, "Audio should have module_id"
        assert data['module_id'] == 'cours-falsafa-grands-mod-1', \
            f"Unexpected module_id: {data.get('module_id')}"

    def test_audio_no_mongodb_id(self):
        """Audio response must not contain MongoDB _id field"""
        resp = requests.get(f"{BASE_URL}/api/audios/aud_cours-falsafa-grands-mod-1")
        data = resp.json()
        assert '_id' not in data, "MongoDB _id should not be in response"


class TestCourseEndpoints:
    """Test course endpoints used by the course detail page"""

    def test_falsafa_grands_course_returns_200(self):
        """GET /api/courses/cours-falsafa-grands → 200"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-falsafa-grands")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"

    def test_falsafa_grands_course_has_is_active(self):
        """Course should be active"""
        resp = requests.get(f"{BASE_URL}/api/courses/cours-falsafa-grands")
        data = resp.json()
        assert data.get('is_active') != False, "Course must be active"

    def test_falsafa_grands_modules_endpoint(self):
        """GET /api/modules?course_id=cours-falsafa-grands → at least 5 modules"""
        resp = requests.get(f"{BASE_URL}/api/modules?course_id=cours-falsafa-grands")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 5, f"Expected at least 5 modules, got {len(data)}"
