"""
Blog Waraqa Feature Tests
Tests the public blog (Waraqa) feature - SEO-friendly Islamic history articles.

Features tested:
- GET /api/blog - Public list of active articles
- GET /api/blog/{id} - Public single article with full content
- GET /api/admin/blog - Admin list all articles (including drafts)
- POST /api/admin/blog/sync-r2 - Sync from R2
- PATCH /api/admin/blog/{id}/toggle - Toggle article active status
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sijill-updates.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "loubna.serrar@gmail.com"
ADMIN_PASSWORD = "Admin123!"


class TestBlogPublicAPIs:
    """Public blog endpoints - no auth required"""

    def test_blog_list_returns_articles(self):
        """GET /api/blog - Should return list of active articles"""
        response = requests.get(f"{BASE_URL}/api/blog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        articles = response.json()
        assert isinstance(articles, list), "Response should be a list"
        print(f"Found {len(articles)} active blog articles")
        
        # Verify at least 1 article exists (as per main agent - 3 synced)
        assert len(articles) >= 1, "Expected at least 1 article"
        
        # Check first article structure for public list view
        article = articles[0]
        expected_fields = ['id', 'series', 'number', 'date_ah', 'date_ce', 'epoch', 'title', 'tags', 'author']
        for field in expected_fields:
            assert field in article, f"Missing field '{field}' in article"
        
        print(f"Article #1: {article.get('title')} by {article.get('author')}")
        return articles

    def test_blog_article_waraqa_370ah(self):
        """GET /api/blog/waraqa-370ah - Should return full article #1"""
        response = requests.get(f"{BASE_URL}/api/blog/waraqa-370ah")
        
        if response.status_code == 404:
            pytest.skip("Article waraqa-370ah not found (may not be synced)")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        article = response.json()
        # Verify full article fields
        expected_fields = ['id', 'series', 'number', 'date_ah', 'date_ce', 'epoch', 
                          'title', 'subtitle', 'tags', 'body_sections', 'context', 
                          'portrait', 'thesis', 'references', 'author', 'seo_description']
        
        for field in expected_fields:
            assert field in article, f"Missing field '{field}' in article"
        
        # Verify body_sections is an array
        assert isinstance(article.get('body_sections'), list), "body_sections should be a list"
        if article['body_sections']:
            section = article['body_sections'][0]
            assert 'type' in section, "Section should have 'type'"
            assert 'content' in section, "Section should have 'content'"
        
        print(f"Article 370AH: {article.get('title')}")
        print(f"  - Epoch: {article.get('epoch')}")
        print(f"  - Tags: {article.get('tags')}")
        print(f"  - Sections: {len(article.get('body_sections', []))}")
        print(f"  - Author: {article.get('author')}")
        return article

    def test_blog_article_waraqa_150ah(self):
        """GET /api/blog/waraqa-150ah - Should return article #2"""
        response = requests.get(f"{BASE_URL}/api/blog/waraqa-150ah")
        
        if response.status_code == 404:
            pytest.skip("Article waraqa-150ah not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        article = response.json()
        
        assert article.get('id') == 'waraqa-150ah', "Article ID mismatch"
        print(f"Article 150AH: {article.get('title')} by {article.get('author')}")
        return article

    def test_blog_article_waraqa_179ah(self):
        """GET /api/blog/waraqa-179ah - Should return article #3"""
        response = requests.get(f"{BASE_URL}/api/blog/waraqa-179ah")
        
        if response.status_code == 404:
            pytest.skip("Article waraqa-179ah not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        article = response.json()
        
        assert article.get('id') == 'waraqa-179ah', "Article ID mismatch"
        print(f"Article 179AH: {article.get('title')} by {article.get('author')}")
        return article

    def test_blog_nonexistent_article_returns_404(self):
        """GET /api/blog/nonexistent - Should return 404"""
        response = requests.get(f"{BASE_URL}/api/blog/nonexistent-article-id")
        assert response.status_code == 404, f"Expected 404 for nonexistent article, got {response.status_code}"


class TestBlogAdminAPIs:
    """Admin blog endpoints - auth required"""

    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        
        token = response.json().get('token')
        assert token, "No token in login response"
        return token

    def test_admin_blog_list_requires_auth(self):
        """GET /api/admin/blog - Should require auth"""
        response = requests.get(f"{BASE_URL}/api/admin/blog")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"

    def test_admin_blog_list_with_auth(self, admin_token):
        """GET /api/admin/blog - Should return all articles including drafts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/blog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        articles = response.json()
        assert isinstance(articles, list), "Response should be a list"
        print(f"Admin view: {len(articles)} total blog articles")
        
        # Count active vs inactive
        active = sum(1 for a in articles if a.get('is_active', True))
        inactive = len(articles) - active
        print(f"  - Active: {active}, Inactive: {inactive}")
        
        return articles

    def test_admin_blog_sync_requires_auth(self):
        """POST /api/admin/blog/sync-r2 - Should require auth"""
        response = requests.post(f"{BASE_URL}/api/admin/blog/sync-r2")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"

    def test_admin_blog_sync_r2(self, admin_token):
        """POST /api/admin/blog/sync-r2 - Should sync articles from R2"""
        response = requests.post(
            f"{BASE_URL}/api/admin/blog/sync-r2",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert 'created' in result, "Missing 'created' in response"
        assert 'updated' in result, "Missing 'updated' in response"
        assert 'deleted' in result, "Missing 'deleted' in response"
        assert 'total' in result, "Missing 'total' in response"
        
        print(f"Blog sync: {result.get('created')} created, {result.get('updated')} updated, {result.get('deleted')} deleted")
        print(f"Total files in R2 Blog/ folder: {result.get('total')}")
        
        return result

    def test_admin_blog_toggle_requires_auth(self):
        """PATCH /api/admin/blog/{id}/toggle - Should require auth"""
        response = requests.patch(f"{BASE_URL}/api/admin/blog/waraqa-370ah/toggle")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"

    def test_admin_blog_toggle_article(self, admin_token):
        """PATCH /api/admin/blog/{id}/toggle - Toggle article active status"""
        # First get current status
        list_response = requests.get(
            f"{BASE_URL}/api/admin/blog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert list_response.status_code == 200
        articles = list_response.json()
        
        if not articles:
            pytest.skip("No articles to toggle")
        
        test_article = articles[0]
        article_id = test_article['id']
        original_status = test_article.get('is_active', True)
        
        # Toggle it
        toggle_response = requests.patch(
            f"{BASE_URL}/api/admin/blog/{article_id}/toggle",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert toggle_response.status_code == 200, f"Toggle failed: {toggle_response.text}"
        
        result = toggle_response.json()
        assert result.get('is_active') == (not original_status), "Toggle should invert status"
        print(f"Toggled {article_id}: {original_status} -> {result.get('is_active')}")
        
        # Toggle back to restore original state
        restore_response = requests.patch(
            f"{BASE_URL}/api/admin/blog/{article_id}/toggle",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert restore_response.status_code == 200
        restored = restore_response.json()
        assert restored.get('is_active') == original_status, "Should restore original status"
        print(f"Restored {article_id}: {result.get('is_active')} -> {restored.get('is_active')}")


class TestBlogToggleAffectsPublicList:
    """Test that toggling affects public visibility"""

    def test_toggle_article_removes_from_public(self):
        """Toggle inactive → verify removed from public list"""
        # Login as admin
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        token = login_response.json().get('token')
        
        # Get public list first
        public_before = requests.get(f"{BASE_URL}/api/blog").json()
        if not public_before:
            pytest.skip("No public articles to test")
        
        test_article_id = public_before[0]['id']
        print(f"Testing toggle visibility for: {test_article_id}")
        
        # Toggle to inactive
        toggle_off = requests.patch(
            f"{BASE_URL}/api/admin/blog/{test_article_id}/toggle",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert toggle_off.status_code == 200
        assert toggle_off.json().get('is_active') == False, "Should now be inactive"
        
        # Verify removed from public list
        public_after = requests.get(f"{BASE_URL}/api/blog").json()
        public_ids_after = [a['id'] for a in public_after]
        assert test_article_id not in public_ids_after, f"{test_article_id} should not appear in public list after toggle off"
        print(f"Confirmed: {test_article_id} removed from public list")
        
        # Verify single article GET returns 404
        single_response = requests.get(f"{BASE_URL}/api/blog/{test_article_id}")
        assert single_response.status_code == 404, f"Inactive article should return 404, got {single_response.status_code}"
        print(f"Confirmed: GET /api/blog/{test_article_id} returns 404 when inactive")
        
        # Toggle back to active
        toggle_on = requests.patch(
            f"{BASE_URL}/api/admin/blog/{test_article_id}/toggle",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert toggle_on.status_code == 200
        assert toggle_on.json().get('is_active') == True, "Should now be active again"
        
        # Verify back in public list
        public_restored = requests.get(f"{BASE_URL}/api/blog").json()
        restored_ids = [a['id'] for a in public_restored]
        assert test_article_id in restored_ids, f"{test_article_id} should reappear in public list"
        print(f"Confirmed: {test_article_id} restored to public list")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
