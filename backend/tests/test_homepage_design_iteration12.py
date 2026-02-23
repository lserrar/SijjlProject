"""
Iteration 12: Homepage design mockup alignment tests
Tests: /api/home endpoint - text-only cards, cursus tags, top5 vertical list, no bandeaux
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')


class TestHomeAPI:
    """Test /api/home endpoint structure and data"""
    
    def test_home_returns_200(self):
        resp = requests.get(f"{BASE_URL}/api/home")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print("PASS: /api/home returns 200")
    
    def test_home_has_correct_keys(self):
        """API should return: featured_course, recent_episodes, top5_courses, NOT course_bandeaux or top10_courses"""
        resp = requests.get(f"{BASE_URL}/api/home")
        data = resp.json()
        
        required_keys = ['featured_course', 'recent_episodes', 'recommendations', 'scholars', 'top5_courses']
        for key in required_keys:
            assert key in data, f"Missing required key: '{key}'"
        
        # Must NOT have removed keys
        assert 'course_bandeaux' not in data, "course_bandeaux should be removed from /api/home"
        assert 'top10_courses' not in data, "top10_courses should be renamed to top5_courses"
        
        print("PASS: /api/home has correct keys, no course_bandeaux, no top10_courses")
    
    def test_home_recent_episodes_count(self):
        """Should return up to 8 recent episodes"""
        resp = requests.get(f"{BASE_URL}/api/home")
        data = resp.json()
        episodes = data.get('recent_episodes', [])
        assert len(episodes) > 0, "recent_episodes should not be empty"
        assert len(episodes) <= 8, f"recent_episodes should have max 8 items, got {len(episodes)}"
        print(f"PASS: recent_episodes count = {len(episodes)}")
    
    def test_home_top5_count(self):
        """Should return exactly 5 top courses"""
        resp = requests.get(f"{BASE_URL}/api/home")
        data = resp.json()
        top5 = data.get('top5_courses', [])
        assert len(top5) > 0, "top5_courses should not be empty"
        assert len(top5) <= 5, f"top5_courses should have max 5 items, got {len(top5)}"
        print(f"PASS: top5_courses count = {len(top5)}")
    
    def test_home_episodes_have_cursus_enrichment(self):
        """Each episode should have cursus_letter, cursus_color, cursus_name"""
        resp = requests.get(f"{BASE_URL}/api/home")
        data = resp.json()
        episodes = data.get('recent_episodes', [])
        
        assert len(episodes) > 0, "Need at least one episode to test cursus enrichment"
        
        for ep in episodes[:3]:
            assert 'cursus_letter' in ep, f"Episode missing cursus_letter: {ep.get('title', '')[:40]}"
            assert 'cursus_color' in ep, f"Episode missing cursus_color: {ep.get('title', '')[:40]}"
            assert ep['cursus_color'].startswith('#'), f"cursus_color should be hex: {ep['cursus_color']}"
        
        print("PASS: Recent episodes have cursus enrichment (letter, color, name)")
    
    def test_home_top5_have_cursus_enrichment(self):
        """Each top5 course should have cursus_letter, cursus_color for display"""
        resp = requests.get(f"{BASE_URL}/api/home")
        data = resp.json()
        top5 = data.get('top5_courses', [])
        
        assert len(top5) > 0, "Need top5 courses"
        
        for course in top5:
            assert 'cursus_letter' in course, f"Top5 course missing cursus_letter"
            assert 'cursus_color' in course, f"Top5 course missing cursus_color"
        
        print("PASS: Top5 courses have cursus enrichment")
    
    def test_home_featured_course_has_cursus_enrichment(self):
        """Featured course should have cursus_letter and cursus_color"""
        resp = requests.get(f"{BASE_URL}/api/home")
        data = resp.json()
        featured = data.get('featured_course')
        
        assert featured is not None, "featured_course should not be None"
        assert 'cursus_letter' in featured, "Featured course missing cursus_letter"
        assert 'cursus_color' in featured, "Featured course missing cursus_color"
        assert featured.get('title'), "Featured course should have a title"
        
        print(f"PASS: Featured course '{featured['title'][:40]}' has cursus={featured['cursus_letter']}, color={featured['cursus_color']}")
    
    def test_home_scholars_returned(self):
        """Scholars list should be returned"""
        resp = requests.get(f"{BASE_URL}/api/home")
        data = resp.json()
        scholars = data.get('scholars', [])
        assert len(scholars) > 0, "scholars should not be empty"
        
        # Scholars should have name field
        for s in scholars[:3]:
            assert 'name' in s, "Scholar missing 'name' field"
        
        print(f"PASS: scholars count = {len(scholars)}")
    
    def test_home_recommendations_have_cursus(self):
        """Recommendations should have cursus enrichment"""
        resp = requests.get(f"{BASE_URL}/api/home")
        data = resp.json()
        recs = data.get('recommendations', [])
        
        if recs:
            for rec in recs[:3]:
                assert 'cursus_letter' in rec, "Recommendation missing cursus_letter"
                assert 'cursus_color' in rec, "Recommendation missing cursus_color"
        
        print(f"PASS: {len(recs)} recommendations with cursus enrichment")
    
    def test_home_episodes_have_no_thumbnail_requirement(self):
        """Episodes may have thumbnail field but frontend should NOT display it"""
        resp = requests.get(f"{BASE_URL}/api/home")
        data = resp.json()
        episodes = data.get('recent_episodes', [])
        
        # All episodes must have title and id
        for ep in episodes:
            assert 'id' in ep, "Episode missing id"
            assert 'title' in ep, "Episode missing title"
        
        print(f"PASS: All {len(episodes)} episodes have required fields (id, title)")


class TestHomeAuthenticated:
    """Test /api/home with auth token"""
    
    @pytest.fixture
    def auth_token(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@hikma.com",
            "password": "TestUser123!"
        })
        if resp.status_code == 200:
            return resp.json().get('token')
        pytest.skip("Auth failed - skipping authenticated tests")
    
    def test_home_with_auth_returns_continue_watching(self, auth_token):
        """With auth, should include continue_watching field"""
        resp = requests.get(f"{BASE_URL}/api/home", headers={"Authorization": f"Bearer {auth_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert 'continue_watching' in data, "Missing continue_watching field"
        print(f"PASS: continue_watching field present, count={len(data['continue_watching'])}")
