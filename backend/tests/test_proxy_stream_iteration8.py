"""
Iteration 8: Test audio proxy stream endpoint, stream-url source, Henry Corbin removal
Tests:
 - /api/audios/{id} stream_url uses proxy path (not R2 presigned)
 - /api/audios/{id}/stream-url returns source='proxy'
 - /api/audios/{id}/stream returns 200, audio content-type, non-empty body
 - /api/audios/{id}/stream with Range header returns 206, correct bytes
 - /api/masterclasses Henry Corbin absent
 - /api/audios/aud_cours-kalam-mod-1/stream accessible (cursus B)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL not set in environment")

AUDIO_ID_FALSAFA = "aud_cours-falsafa-grands-mod-1"
AUDIO_ID_KALAM   = "aud_cours-kalam-mod-1"
HENRY_CORBIN_NAME = "henry corbin"

# ─── Helper ─────────────────────────────────────────────────────────────────

def login(email: str, password: str) -> str:
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=15,
    )
    if resp.status_code == 200:
        return resp.json().get("token", "")
    return ""


@pytest.fixture(scope="module")
def auth_token():
    token = login("testuser@hikma.com", "TestUser123!")
    if not token:
        pytest.skip("Login failed – skipping authenticated tests")
    return token


# ─── Test 1: GET /api/audios/{id} → stream_url uses proxy path ───────────────

class TestAudioStreamUrlProxy:
    """stream_url in audio doc must point to backend proxy, not R2 presigned URL"""

    def test_audio_stream_url_is_proxy(self):
        """stream_url must be /api/audios/{id}/stream (proxy), not a presigned R2 URL"""
        resp = requests.get(f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}", timeout=15)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        data = resp.json()
        stream_url = data.get("stream_url", "")
        print(f"stream_url: {stream_url}")

        # Must not be a presigned R2 URL (which contains X-Amz-Signature or r2.cloudflarestorage)
        assert "r2.cloudflarestorage.com" not in stream_url, (
            f"stream_url should not be a direct R2 presigned URL: {stream_url}"
        )
        assert "X-Amz-Signature" not in stream_url, (
            f"stream_url should not contain AWS signature: {stream_url}"
        )

        # Must be the proxy endpoint
        expected_proxy_path = f"/api/audios/{AUDIO_ID_FALSAFA}/stream"
        assert stream_url.endswith(expected_proxy_path), (
            f"stream_url '{stream_url}' should end with '{expected_proxy_path}'"
        )
        print(f"PASS: stream_url is proxy URL: {stream_url}")

    def test_audio_stream_url_uses_public_url(self):
        """stream_url must start with the PUBLIC_URL (https://audio-sync-preview...)"""
        resp = requests.get(f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}", timeout=15)
        assert resp.status_code == 200

        data = resp.json()
        stream_url = data.get("stream_url", "")
        # Should start with https:// (not localhost or empty)
        assert stream_url.startswith("https://"), (
            f"stream_url should be a full HTTPS URL, got: {stream_url}"
        )
        print(f"PASS: stream_url is absolute HTTPS proxy URL")


# ─── Test 2: GET /api/audios/{id}/stream-url → source='proxy' ────────────────

class TestAudioStreamUrlEndpoint:
    """stream-url endpoint must return source='proxy' (not 'r2')"""

    def test_stream_url_source_is_proxy(self):
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream-url",
            timeout=15,
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        data = resp.json()
        print(f"stream-url response: {data}")

        source = data.get("source", "")
        assert source == "proxy", (
            f"Expected source='proxy', got source='{source}'. Full response: {data}"
        )
        print(f"PASS: source='proxy' confirmed")

    def test_stream_url_endpoint_returns_proxy_path(self):
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream-url",
            timeout=15,
        )
        assert resp.status_code == 200

        data = resp.json()
        stream_url = data.get("stream_url", "")

        expected_proxy_path = f"/api/audios/{AUDIO_ID_FALSAFA}/stream"
        assert stream_url.endswith(expected_proxy_path), (
            f"stream_url '{stream_url}' should contain proxy path '{expected_proxy_path}'"
        )
        assert "r2.cloudflarestorage.com" not in stream_url, (
            f"stream_url should not be a direct R2 URL: {stream_url}"
        )
        print(f"PASS: stream-url endpoint returns proxy path: {stream_url}")

    def test_stream_url_audio_id_matches(self):
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream-url",
            timeout=15,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("audio_id") == AUDIO_ID_FALSAFA, (
            f"Expected audio_id='{AUDIO_ID_FALSAFA}', got '{data.get('audio_id')}'"
        )
        print(f"PASS: audio_id matches in stream-url response")


# ─── Test 3: GET /api/audios/{id}/stream → 200, audio content-type ──────────

class TestAudioStreamProxy:
    """Proxy stream endpoint must return 200 with audio content and non-empty body"""

    def test_stream_returns_200(self):
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream",
            timeout=30,
            stream=True,
        )
        print(f"stream status: {resp.status_code}, content-type: {resp.headers.get('content-type')}")
        assert resp.status_code == 200, (
            f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
        )
        print(f"PASS: /stream returns 200")

    def test_stream_content_type_is_audio(self):
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream",
            timeout=30,
            stream=True,
        )
        assert resp.status_code == 200

        content_type = resp.headers.get("content-type", "")
        assert "audio" in content_type.lower(), (
            f"Expected audio content-type, got: '{content_type}'"
        )
        print(f"PASS: content-type is audio: {content_type}")

    def test_stream_content_length_positive(self):
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream",
            timeout=30,
            stream=True,
        )
        assert resp.status_code == 200

        content_length = resp.headers.get("content-length")
        if content_length:
            length = int(content_length)
            assert length > 0, f"content-length should be > 0, got: {length}"
            print(f"PASS: content-length={length} bytes")
        else:
            # No content-length header, check body
            chunk = next(resp.iter_content(chunk_size=1024), b"")
            assert len(chunk) > 0, "Stream body should be non-empty"
            print(f"PASS: stream body is non-empty (no content-length header)")

    def test_stream_body_non_empty(self):
        """Actually download some bytes to confirm content flows"""
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream",
            timeout=60,
            stream=True,
        )
        assert resp.status_code == 200
        # Read first 1KB
        first_chunk = b""
        for chunk in resp.iter_content(chunk_size=1024):
            first_chunk += chunk
            if len(first_chunk) >= 1024:
                break
        assert len(first_chunk) > 0, "Stream body is empty"
        print(f"PASS: received {len(first_chunk)} bytes from stream")
        resp.close()


# ─── Test 4: Range request → 206, 4096 bytes ────────────────────────────────

class TestAudioStreamRangeRequest:
    """Range request must return 206 with exactly 4096 bytes"""

    def test_range_request_returns_206(self):
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream",
            headers={"Range": "bytes=0-4095"},
            timeout=30,
        )
        print(f"Range request status: {resp.status_code}, content-range: {resp.headers.get('content-range')}")
        assert resp.status_code == 206, (
            f"Expected 206 Partial Content for Range request, got {resp.status_code}"
        )
        print(f"PASS: Range request returns 206")

    def test_range_request_returns_4096_bytes(self):
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream",
            headers={"Range": "bytes=0-4095"},
            timeout=30,
        )
        assert resp.status_code == 206

        body_len = len(resp.content)
        assert body_len == 4096, (
            f"Expected 4096 bytes for Range bytes=0-4095, got {body_len}"
        )
        print(f"PASS: Range request returns {body_len} bytes")

    def test_range_request_has_content_range_header(self):
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream",
            headers={"Range": "bytes=0-4095"},
            timeout=30,
        )
        assert resp.status_code == 206

        content_range = resp.headers.get("content-range", "")
        assert content_range, "Response should include Content-Range header"
        assert "bytes" in content_range.lower(), (
            f"Content-Range should contain 'bytes', got: '{content_range}'"
        )
        print(f"PASS: Content-Range header: {content_range}")

    def test_range_request_accept_ranges_header(self):
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream",
            timeout=30,
            stream=True,
        )
        accept_ranges = resp.headers.get("accept-ranges", "")
        assert accept_ranges.lower() == "bytes", (
            f"Expected Accept-Ranges: bytes, got: '{accept_ranges}'"
        )
        resp.close()
        print(f"PASS: Accept-Ranges: {accept_ranges}")


# ─── Test 5: Masterclasses - Henry Corbin absent ─────────────────────────────

class TestMasterclassesNoHenryCorbin:
    """Henry Corbin must not appear in any masterclass"""

    def test_masterclasses_henry_corbin_absent(self):
        resp = requests.get(f"{BASE_URL}/api/masterclasses", timeout=15)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"

        masterclasses = resp.json()
        print(f"Total masterclasses: {len(masterclasses)}")

        for mc in masterclasses:
            title = mc.get("title", "").lower()
            speaker = mc.get("speaker_name", "").lower()
            description = mc.get("description", "").lower()

            assert HENRY_CORBIN_NAME not in title, (
                f"Henry Corbin found in masterclass title: '{mc.get('title')}'"
            )
            assert HENRY_CORBIN_NAME not in speaker, (
                f"Henry Corbin found in masterclass speaker_name: '{mc.get('speaker_name')}'"
            )
            assert HENRY_CORBIN_NAME not in description, (
                f"Henry Corbin found in masterclass description: '{mc.get('description')}'"
            )

        print(f"PASS: Henry Corbin not found in {len(masterclasses)} masterclasses")


# ─── Test 6: Cursus B (Kalam) audio stream accessible ─────────────────────────

class TestKalamAudioStream:
    """Audio from Cursus B (Kalam) must also be streamable"""

    def test_kalam_audio_exists(self):
        resp = requests.get(f"{BASE_URL}/api/audios/{AUDIO_ID_KALAM}", timeout=15)
        assert resp.status_code == 200, (
            f"Expected 200 for {AUDIO_ID_KALAM}, got {resp.status_code}: {resp.text[:200]}"
        )
        data = resp.json()
        print(f"Kalam audio: {data.get('title')}, file_key: {data.get('file_key')}")
        print(f"PASS: Kalam audio exists")

    def test_kalam_audio_has_stream_url(self):
        resp = requests.get(f"{BASE_URL}/api/audios/{AUDIO_ID_KALAM}", timeout=15)
        assert resp.status_code == 200

        data = resp.json()
        stream_url = data.get("stream_url", "")
        assert stream_url, f"Kalam audio has no stream_url"
        assert "r2.cloudflarestorage.com" not in stream_url, (
            f"Kalam stream_url should use proxy, not R2: {stream_url}"
        )
        print(f"PASS: Kalam stream_url is proxy: {stream_url}")

    def test_kalam_audio_stream_accessible(self):
        resp = requests.get(
            f"{BASE_URL}/api/audios/{AUDIO_ID_KALAM}/stream",
            timeout=30,
            stream=True,
        )
        print(f"Kalam stream status: {resp.status_code}")
        # Accept 200 or 206 (both indicate accessible content)
        assert resp.status_code in (200, 206), (
            f"Expected 200/206 for Kalam stream, got {resp.status_code}: {resp.text[:200]}"
        )
        content_type = resp.headers.get("content-type", "")
        assert "audio" in content_type.lower(), (
            f"Expected audio content-type for Kalam stream, got: '{content_type}'"
        )
        resp.close()
        print(f"PASS: Kalam audio stream accessible with content-type: {content_type}")


# ─── Test 7: HEAD request on /stream ─────────────────────────────────────────

class TestAudioStreamHeadRequest:
    """HEAD request on /stream should also be supported"""

    def test_head_request_on_stream(self):
        resp = requests.head(
            f"{BASE_URL}/api/audios/{AUDIO_ID_FALSAFA}/stream",
            timeout=15,
        )
        print(f"HEAD /stream status: {resp.status_code}")
        assert resp.status_code in (200, 206), (
            f"Expected 200/206 for HEAD request, got {resp.status_code}"
        )
        print(f"PASS: HEAD request on /stream returns {resp.status_code}")
