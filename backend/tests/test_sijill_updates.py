"""
Backend API Tests for Sijill Project Updates
Tests for: cursus list, favicon, homepage features
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://learn-preview-4.preview.emergentagent.com').rstrip('/')

class TestCursusAPI:
    """Tests for /api/cursus endpoint - should return 6 cursus items"""
    
    def test_get_cursus_returns_six_items(self):
        """Test that GET /api/cursus returns exactly 6 cursus items"""
        response = requests.get(f"{BASE_URL}/api/cursus")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 6, f"Expected 6 cursus items, got {len(data)}"
        
        # Verify each cursus has required fields
        required_fields = ['id', 'name', 'description', 'order', 'is_active']
        for cursus in data:
            for field in required_fields:
                assert field in cursus, f"Missing field '{field}' in cursus {cursus.get('id', 'unknown')}"
        
        print(f"✅ /api/cursus returns {len(data)} cursus items")
    
    def test_cursus_contains_pensees_non_islamiques(self):
        """Test that the new 'Pensées arabes non islamiques' cursus is present"""
        response = requests.get(f"{BASE_URL}/api/cursus")
        assert response.status_code == 200
        
        data = response.json()
        cursus_ids = [c['id'] for c in data]
        
        assert 'cursus-pensees-non-islamiques' in cursus_ids, "New cursus 'cursus-pensees-non-islamiques' should be present"
        
        # Find the new cursus and verify its details
        new_cursus = next((c for c in data if c['id'] == 'cursus-pensees-non-islamiques'), None)
        assert new_cursus is not None, "Could not find new cursus"
        assert new_cursus['name'] == 'Pensées arabes non islamiques', f"Unexpected name: {new_cursus['name']}"
        assert new_cursus['order'] == 6, f"Expected order 6, got {new_cursus['order']}"
        assert new_cursus['is_active'] == True, "New cursus should be active"
        
        print(f"✅ New cursus 'cursus-pensees-non-islamiques' verified")
    
    def test_cursus_order_is_correct(self):
        """Test that cursus are in correct order (1-6)"""
        response = requests.get(f"{BASE_URL}/api/cursus")
        assert response.status_code == 200
        
        data = response.json()
        orders = [c['order'] for c in data]
        
        assert sorted(orders) == [1, 2, 3, 4, 5, 6], f"Expected orders 1-6, got {sorted(orders)}"
        
        # Verify specific order
        expected_order = [
            ('cursus-falsafa', 1),
            ('cursus-theologie', 2),
            ('cursus-sciences-islamiques', 3),
            ('cursus-arts', 4),
            ('cursus-spiritualites', 5),
            ('cursus-pensees-non-islamiques', 6),
        ]
        
        for cursus_id, expected_order_num in expected_order:
            cursus = next((c for c in data if c['id'] == cursus_id), None)
            if cursus:
                assert cursus['order'] == expected_order_num, f"{cursus_id} should have order {expected_order_num}, got {cursus['order']}"
        
        print("✅ Cursus order is correct")


class TestFavicon:
    """Tests for favicon endpoint"""
    
    def test_favicon_svg_exists(self):
        """Test that favicon.svg is accessible"""
        response = requests.get(f"{BASE_URL}/api/site/favicon.svg")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'svg' in content_type.lower() or 'xml' in content_type.lower(), f"Expected SVG content type, got {content_type}"
        
        # Verify it contains SVG content
        content = response.text
        assert '<svg' in content.lower(), "Response should contain SVG element"
        assert 'Sijill' in content or '#04D182' in content, "SVG should contain brand colors"
        
        print("✅ Favicon SVG exists and is valid")


class TestHomepage:
    """Tests for homepage API endpoints"""
    
    def test_homepage_html_loads(self):
        """Test that homepage HTML loads correctly"""
        response = requests.get(f"{BASE_URL}/api/site/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        content = response.text
        assert 'Sijill Project' in content, "Homepage should contain 'Sijill Project'"
        assert 'favicon.svg' in content, "Homepage should reference favicon"
        
        print("✅ Homepage HTML loads correctly")
    
    def test_thematiques_endpoint(self):
        """Test /api/thematiques endpoint (alias for cursus)"""
        response = requests.get(f"{BASE_URL}/api/thematiques")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 6, f"Expected 6 thematiques, got {len(data)}"
        
        print(f"✅ /api/thematiques returns {len(data)} items")


class TestCursusConstants:
    """Test that cursus colors and letters are correctly mapped"""
    
    def test_cursus_have_valid_ids(self):
        """Test that all cursus have valid IDs that match the color/letter mapping"""
        response = requests.get(f"{BASE_URL}/api/cursus")
        assert response.status_code == 200
        
        data = response.json()
        expected_ids = [
            'cursus-falsafa',
            'cursus-theologie',
            'cursus-sciences-islamiques',
            'cursus-arts',
            'cursus-spiritualites',
            'cursus-pensees-non-islamiques',
        ]
        
        actual_ids = [c['id'] for c in data]
        for expected_id in expected_ids:
            assert expected_id in actual_ids, f"Missing cursus ID: {expected_id}"
        
        print("✅ All cursus IDs are present and valid")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
