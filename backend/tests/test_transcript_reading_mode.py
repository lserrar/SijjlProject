"""
Backend API tests for the Transcript/Reading Mode feature (Mode Lecture)
Tests the transcript endpoints and related audio functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://reading-hub-33.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "loubniz@hotmail.com"
TEST_PASSWORD = "loulouz"
AUDIO_WITH_TRANSCRIPT = "aud_cours-traduction-mod-1"
AUDIO_WITHOUT_TRANSCRIPT = "aud_cours-alkindi-mod-1"


class TestAuthForTranscript:
    """Authentication tests (required for some transcript operations)"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✅ Login successful for {TEST_EMAIL}")


class TestAudioListEndpoint:
    """Test audio list endpoint - should return has_transcript field"""
    
    def test_get_audios_returns_has_transcript_field(self):
        """GET /api/audios should return audios with has_transcript field"""
        response = requests.get(f"{BASE_URL}/api/audios")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Find the audio with transcript
        audio_with_transcript = next(
            (a for a in data if a.get('id') == AUDIO_WITH_TRANSCRIPT), 
            None
        )
        assert audio_with_transcript is not None, f"Audio {AUDIO_WITH_TRANSCRIPT} not found"
        assert audio_with_transcript.get('has_transcript') == True, "First audio should have has_transcript: true"
        print(f"✅ Audio list contains has_transcript field, {AUDIO_WITH_TRANSCRIPT} has_transcript=True")


class TestTranscriptEndpoint:
    """Test the transcript API endpoint - GET /api/audios/{audio_id}/transcript"""
    
    def test_get_transcript_for_audio_with_transcript(self):
        """Audio with transcript should return full transcript data"""
        response = requests.get(f"{BASE_URL}/api/audios/{AUDIO_WITH_TRANSCRIPT}/transcript")
        assert response.status_code == 200
        data = response.json()
        
        # Verify has_transcript field
        assert data.get('has_transcript') == True, "has_transcript should be True"
        
        # Verify content field
        assert 'content' in data, "Response should have 'content' field"
        assert len(data['content']) > 0, "Content should not be empty"
        
        # Verify title field
        assert 'title' in data, "Response should have 'title' field"
        assert len(data['title']) > 0, "Title should not be empty"
        
        # Verify word_count field
        assert 'word_count' in data, "Response should have 'word_count' field"
        assert isinstance(data['word_count'], int), "word_count should be an integer"
        assert data['word_count'] > 0, "word_count should be positive"
        
        # Verify reading_time_minutes field
        assert 'reading_time_minutes' in data, "Response should have 'reading_time_minutes' field"
        assert isinstance(data['reading_time_minutes'], int), "reading_time_minutes should be an integer"
        assert data['reading_time_minutes'] > 0, "reading_time_minutes should be positive"
        
        print(f"✅ Transcript for {AUDIO_WITH_TRANSCRIPT}:")
        print(f"   - title: {data['title'][:60]}...")
        print(f"   - word_count: {data['word_count']}")
        print(f"   - reading_time_minutes: {data['reading_time_minutes']}")
        print(f"   - content length: {len(data['content'])} chars")
    
    def test_get_transcript_for_audio_without_transcript(self):
        """Audio without transcript should return has_transcript: false"""
        response = requests.get(f"{BASE_URL}/api/audios/{AUDIO_WITHOUT_TRANSCRIPT}/transcript")
        assert response.status_code == 200
        data = response.json()
        
        # Verify has_transcript is false
        assert data.get('has_transcript') == False, "has_transcript should be False for audio without transcript"
        
        # Verify audio_id is returned
        assert data.get('audio_id') == AUDIO_WITHOUT_TRANSCRIPT, f"audio_id should be {AUDIO_WITHOUT_TRANSCRIPT}"
        
        print(f"✅ Audio without transcript ({AUDIO_WITHOUT_TRANSCRIPT}) returns has_transcript=False")
    
    def test_get_transcript_for_nonexistent_audio(self):
        """Non-existent audio should return has_transcript: false (not 404)"""
        response = requests.get(f"{BASE_URL}/api/audios/nonexistent-audio-id/transcript")
        assert response.status_code == 200
        data = response.json()
        
        # API returns has_transcript: false for non-existent audios (graceful handling)
        assert data.get('has_transcript') == False
        print("✅ Non-existent audio returns has_transcript=False (graceful handling)")


class TestAudioDetailEndpoint:
    """Test the audio detail endpoint - should include has_transcript field"""
    
    def test_get_audio_detail_includes_has_transcript(self):
        """GET /api/audios/{audio_id} should include has_transcript field"""
        response = requests.get(f"{BASE_URL}/api/audios/{AUDIO_WITH_TRANSCRIPT}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify basic audio fields
        assert data.get('id') == AUDIO_WITH_TRANSCRIPT
        assert 'title' in data
        assert 'stream_url' in data
        
        # Verify has_transcript field is present
        assert 'has_transcript' in data, "Audio detail should include has_transcript field"
        assert data['has_transcript'] == True, "This audio should have has_transcript: true"
        
        print(f"✅ Audio detail for {AUDIO_WITH_TRANSCRIPT} includes has_transcript=True")


class TestAlternativeTranscriptEndpoint:
    """Test the alternative transcript endpoint - GET /api/transcripts/{audio_id}"""
    
    def test_get_transcript_via_alternative_endpoint(self):
        """GET /api/transcripts/{audio_id} should return transcript"""
        response = requests.get(f"{BASE_URL}/api/transcripts/{AUDIO_WITH_TRANSCRIPT}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify content
        assert 'content' in data
        assert 'title' in data
        print(f"✅ Alternative transcript endpoint works for {AUDIO_WITH_TRANSCRIPT}")
    
    def test_get_transcript_via_alternative_endpoint_404_for_missing(self):
        """GET /api/transcripts/{audio_id} returns 404 for audio without transcript"""
        response = requests.get(f"{BASE_URL}/api/transcripts/{AUDIO_WITHOUT_TRANSCRIPT}")
        assert response.status_code == 404
        print(f"✅ Alternative transcript endpoint returns 404 for audio without transcript")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
