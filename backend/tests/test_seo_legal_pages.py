"""
SEO, Social Sharing, Legal Pages & Sitemap Testing
===================================================
Tests for iteration 29: SEO features, social sharing buttons, legal pages,
sitemap.xml, robots.txt, and OG meta injection.
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL not set")


class TestRobotsTxt:
    """robots.txt endpoint tests"""
    
    def test_robots_txt_accessible(self):
        """robots.txt should return 200 status"""
        response = requests.get(f"{BASE_URL}/api/site/robots.txt")
        assert response.status_code == 200
        print(f"✅ robots.txt accessible - Status: {response.status_code}")
    
    def test_robots_txt_content(self):
        """robots.txt should contain User-agent and Sitemap"""
        response = requests.get(f"{BASE_URL}/api/site/robots.txt")
        content = response.text
        
        assert "User-agent:" in content, "Missing User-agent directive"
        assert "Sitemap:" in content, "Missing Sitemap directive"
        print(f"✅ robots.txt contains required directives")
        print(f"   Content: {content[:100]}...")


class TestSitemapXml:
    """sitemap.xml endpoint tests"""
    
    def test_sitemap_xml_accessible(self):
        """sitemap.xml should return 200 status"""
        response = requests.get(f"{BASE_URL}/api/site/sitemap.xml")
        assert response.status_code == 200
        assert "application/xml" in response.headers.get("Content-Type", "")
        print(f"✅ sitemap.xml accessible - Status: {response.status_code}")
    
    def test_sitemap_contains_static_pages(self):
        """sitemap.xml should contain all static pages"""
        response = requests.get(f"{BASE_URL}/api/site/sitemap.xml")
        content = response.text
        
        static_pages = [
            "sijill.com</loc>",  # homepage
            "/cursus</loc>",
            "/catalogue</loc>",
            "/blog</loc>",
            "/a-propos</loc>",
            "/mentions-legales</loc>",
            "/politique-de-confidentialite</loc>",
            "/conditions-utilisation</loc>"
        ]
        
        for page in static_pages:
            assert page in content, f"Missing page in sitemap: {page}"
        print(f"✅ sitemap.xml contains all {len(static_pages)} static pages")
    
    def test_sitemap_contains_blog_articles(self):
        """sitemap.xml should include blog article URLs"""
        response = requests.get(f"{BASE_URL}/api/site/sitemap.xml")
        content = response.text
        
        # Check for at least one blog article URL
        assert "/blog/mondeen-" in content, "Missing blog article URLs in sitemap"
        
        # Count blog articles
        blog_matches = re.findall(r'/blog/mondeen-\d+', content)
        print(f"✅ sitemap.xml contains {len(blog_matches)} blog article URLs")


class TestOGMetaInjection:
    """Server-side OG meta tag injection for blog articles"""
    
    def test_og_meta_tags_in_blog_article(self):
        """Blog article HTML should contain injected OG meta tags"""
        response = requests.get(f"{BASE_URL}/api/site/blog/mondeen-370")
        assert response.status_code == 200
        html = response.text
        
        # Check for OG meta tags
        assert 'og:type' in html, "Missing og:type meta tag"
        assert 'og:title' in html, "Missing og:title meta tag"
        assert 'og:description' in html, "Missing og:description meta tag"
        assert 'og:url' in html, "Missing og:url meta tag"
        assert 'og:image' in html, "Missing og:image meta tag"
        print(f"✅ All OG meta tags present in blog article HTML")
    
    def test_og_meta_contains_article_data(self):
        """OG meta tags should contain article-specific data"""
        response = requests.get(f"{BASE_URL}/api/site/blog/mondeen-370")
        html = response.text
        
        # Check for article-specific content in OG tags
        assert 'content="article"' in html, "og:type should be 'article'"
        assert "Sijill Times #1" in html or "deux mondes" in html, "Article title should be in OG tags"
        assert "/blog/mondeen-370" in html, "Article URL should be in OG meta"
        print(f"✅ OG meta tags contain article-specific data")
    
    def test_twitter_card_meta_tags(self):
        """Blog article should have Twitter Card meta tags"""
        response = requests.get(f"{BASE_URL}/api/site/blog/mondeen-370")
        html = response.text
        
        assert 'twitter:card' in html, "Missing twitter:card meta tag"
        assert 'twitter:title' in html, "Missing twitter:title meta tag"
        assert 'twitter:description' in html, "Missing twitter:description meta tag"
        print(f"✅ Twitter Card meta tags present")


class TestLegalPages:
    """Legal pages (mentions-legales, CGU, confidentialite) tests"""
    
    def test_mentions_legales_accessible(self):
        """Mentions légales page should return 200"""
        response = requests.get(f"{BASE_URL}/api/site/mentions-legales")
        assert response.status_code == 200
        print(f"✅ Mentions légales page accessible")
    
    def test_mentions_legales_content(self):
        """Mentions légales should contain Sijill Project SAS info"""
        response = requests.get(f"{BASE_URL}/api/site/mentions-legales")
        html = response.text
        
        # Check for company info
        assert "Sijill Project SAS" in html or "Sijill Project" in html, "Company name missing"
        print(f"✅ Mentions légales contains company info")
    
    def test_politique_confidentialite_accessible(self):
        """Politique de confidentialité page should return 200"""
        response = requests.get(f"{BASE_URL}/api/site/politique-de-confidentialite")
        assert response.status_code == 200
        print(f"✅ Politique de confidentialité page accessible")
    
    def test_cgu_accessible(self):
        """CGU page should return 200"""
        response = requests.get(f"{BASE_URL}/api/site/conditions-utilisation")
        assert response.status_code == 200
        print(f"✅ CGU page accessible")


class TestMainPages:
    """Main website pages tests"""
    
    def test_home_page_accessible(self):
        """Home page should return 200"""
        response = requests.get(f"{BASE_URL}/api/site/")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("Content-Type", "")
        print(f"✅ Home page accessible")
    
    def test_cursus_page_accessible(self):
        """Cursus page should return 200"""
        response = requests.get(f"{BASE_URL}/api/site/cursus")
        assert response.status_code == 200
        print(f"✅ Cursus page accessible")
    
    def test_blog_list_accessible(self):
        """Blog list page should return 200"""
        response = requests.get(f"{BASE_URL}/api/site/blog")
        assert response.status_code == 200
        print(f"✅ Blog list page accessible")
    
    def test_blog_article_accessible(self):
        """Blog article page should return 200"""
        response = requests.get(f"{BASE_URL}/api/site/blog/mondeen-370")
        assert response.status_code == 200
        print(f"✅ Blog article page accessible")


class TestBlogAPI:
    """Blog API endpoint tests"""
    
    def test_blog_api_list(self):
        """GET /api/blog should return list of articles"""
        response = requests.get(f"{BASE_URL}/api/blog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Blog API should return a list"
        assert len(data) > 0, "Blog list should not be empty"
        print(f"✅ Blog API returns {len(data)} articles")
    
    def test_blog_api_article(self):
        """GET /api/blog/{id} should return article data"""
        response = requests.get(f"{BASE_URL}/api/blog/mondeen-370")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "title" in data, "Article should have title"
        assert "id" in data, "Article should have id"
        assert "seo_description" in data, "Article should have seo_description"
        print(f"✅ Blog article API returns expected fields")
        print(f"   Title: {data.get('title', 'N/A')[:50]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
