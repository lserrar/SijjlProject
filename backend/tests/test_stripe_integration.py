"""
Stripe Integration Tests for HikmabyLM Platform

Tests the following endpoints:
- GET /api/plans - Public plans endpoint
- GET /api/admin/plans - Admin plans list
- POST /api/admin/plans - Create new plan
- PUT /api/admin/plans/{plan_id} - Update plan
- DELETE /api/admin/plans/{plan_id} - Delete plan
- POST /api/checkout/create - Create Stripe checkout session
- GET /api/checkout/status/{session_id} - Check payment status
- GET /api/user/access - Check user access
- GET /api/admin/transactions - List recent transactions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/') or os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://learn-quran-10.preview.emergentagent.com"

ADMIN_EMAIL = "admin@hikma-admin.com"
ADMIN_PASSWORD = "Admin123!"


class TestPublicPlansEndpoint:
    """Tests for GET /api/plans - Public endpoint"""
    
    def test_get_plans_returns_list(self):
        """GET /api/plans should return a list of plans"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/plans returned {len(data)} plans")
    
    def test_get_plans_no_auth_required(self):
        """GET /api/plans should work without authentication"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        # Should not return 401 or 403
        assert response.status_code not in [401, 403]
        print("✓ GET /api/plans works without authentication")


class TestAdminPlansEndpoints:
    """Tests for admin plans CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed - skipping admin tests")
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_admin_get_plans_requires_auth(self):
        """GET /api/admin/plans should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/plans")
        assert response.status_code == 403
        print("✓ GET /api/admin/plans requires authentication")
    
    def test_admin_get_plans_with_auth(self):
        """GET /api/admin/plans should return plans for admin"""
        response = requests.get(f"{BASE_URL}/api/admin/plans", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/plans returned {len(data)} plans")
    
    def test_admin_create_plan(self):
        """POST /api/admin/plans should create a new plan"""
        plan_data = {
            "plan_id": "TEST_plan_stripe_001",
            "name": "Test Stripe Plan",
            "price": 4.99,
            "duration_days": 14,
            "type": "subscription",
            "description": "Test plan for Stripe integration",
            "is_active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/plans",
            headers=self.headers,
            json=plan_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["plan_id"] == plan_data["plan_id"]
        assert data["name"] == plan_data["name"]
        assert data["price"] == plan_data["price"]
        print(f"✓ POST /api/admin/plans created plan: {data['plan_id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/plans/{plan_data['plan_id']}", headers=self.headers)
    
    def test_admin_create_duplicate_plan_fails(self):
        """POST /api/admin/plans should fail for duplicate plan_id"""
        plan_data = {
            "plan_id": "TEST_dup_plan",
            "name": "Dup Test Plan",
            "price": 1.99,
            "duration_days": 7,
            "type": "subscription",
            "is_active": True
        }
        # Create first plan
        response1 = requests.post(f"{BASE_URL}/api/admin/plans", headers=self.headers, json=plan_data)
        assert response1.status_code == 200
        
        # Try to create duplicate
        response2 = requests.post(f"{BASE_URL}/api/admin/plans", headers=self.headers, json=plan_data)
        assert response2.status_code == 400
        print("✓ POST /api/admin/plans rejects duplicate plan_id")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/plans/{plan_data['plan_id']}", headers=self.headers)
    
    def test_admin_update_plan(self):
        """PUT /api/admin/plans/{plan_id} should update plan"""
        # Create plan first
        plan_data = {
            "plan_id": "TEST_update_plan",
            "name": "Original Name",
            "price": 9.99,
            "duration_days": 30,
            "type": "subscription",
            "is_active": True
        }
        requests.post(f"{BASE_URL}/api/admin/plans", headers=self.headers, json=plan_data)
        
        # Update plan
        update_data = {"name": "Updated Name", "price": 12.99}
        response = requests.put(
            f"{BASE_URL}/api/admin/plans/{plan_data['plan_id']}",
            headers=self.headers,
            json=update_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["price"] == 12.99
        print(f"✓ PUT /api/admin/plans/{plan_data['plan_id']} updated successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/plans/{plan_data['plan_id']}", headers=self.headers)
    
    def test_admin_delete_plan(self):
        """DELETE /api/admin/plans/{plan_id} should delete plan"""
        # Create plan first
        plan_data = {
            "plan_id": "TEST_delete_plan",
            "name": "To Delete",
            "price": 5.99,
            "duration_days": 15,
            "type": "subscription",
            "is_active": True
        }
        requests.post(f"{BASE_URL}/api/admin/plans", headers=self.headers, json=plan_data)
        
        # Delete plan
        response = requests.delete(
            f"{BASE_URL}/api/admin/plans/{plan_data['plan_id']}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Plan supprime"
        print(f"✓ DELETE /api/admin/plans/{plan_data['plan_id']} deleted successfully")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/admin/plans", headers=self.headers)
        plans = get_response.json()
        plan_ids = [p["plan_id"] for p in plans]
        assert plan_data["plan_id"] not in plan_ids
        print("✓ Verified plan no longer exists")
    
    def test_admin_delete_nonexistent_plan(self):
        """DELETE /api/admin/plans/{plan_id} should return 404 for non-existent plan"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/plans/nonexistent_plan_xyz",
            headers=self.headers
        )
        assert response.status_code == 404
        print("✓ DELETE /api/admin/plans returns 404 for non-existent plan")


class TestCheckoutEndpoints:
    """Tests for Stripe checkout endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed - skipping checkout tests")
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_checkout_create_requires_auth(self):
        """POST /api/checkout/create should require authentication"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            json={"plan_id": "monthly", "origin_url": "https://example.com"}
        )
        assert response.status_code == 401
        print("✓ POST /api/checkout/create requires authentication")
    
    def test_checkout_create_requires_plan_or_course(self):
        """POST /api/checkout/create should require plan_id, course_id, or cursus_id"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers=self.headers,
            json={"origin_url": "https://example.com"}
        )
        assert response.status_code == 400
        print("✓ POST /api/checkout/create requires plan/course/cursus")
    
    def test_checkout_create_invalid_plan(self):
        """POST /api/checkout/create should return 404 for invalid plan"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers=self.headers,
            json={"plan_id": "invalid_plan_xyz", "origin_url": "https://example.com"}
        )
        assert response.status_code == 404
        print("✓ POST /api/checkout/create returns 404 for invalid plan")
    
    def test_checkout_create_monthly_plan(self):
        """POST /api/checkout/create should create session for default monthly plan"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers=self.headers,
            json={"plan_id": "monthly", "origin_url": "https://learn-quran-10.preview.emergentagent.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["url"].startswith("https://checkout.stripe.com")
        assert data["session_id"].startswith("cs_test_")
        print(f"✓ POST /api/checkout/create created session: {data['session_id'][:30]}...")
    
    def test_checkout_create_annual_plan(self):
        """POST /api/checkout/create should create session for default annual plan"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers=self.headers,
            json={"plan_id": "annual", "origin_url": "https://learn-quran-10.preview.emergentagent.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        print(f"✓ POST /api/checkout/create created annual session: {data['session_id'][:30]}...")
    
    def test_checkout_status(self):
        """GET /api/checkout/status/{session_id} should return session status"""
        # First create a session
        create_response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers=self.headers,
            json={"plan_id": "monthly", "origin_url": "https://learn-quran-10.preview.emergentagent.com"}
        )
        session_id = create_response.json().get("session_id")
        
        # Check status
        response = requests.get(
            f"{BASE_URL}/api/checkout/status/{session_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "payment_status" in data
        print(f"✓ GET /api/checkout/status returned status: {data['status']}, payment: {data['payment_status']}")
    
    def test_checkout_status_invalid_session(self):
        """GET /api/checkout/status/{session_id} should return 404 for invalid session"""
        response = requests.get(
            f"{BASE_URL}/api/checkout/status/invalid_session_xyz",
            headers=self.headers
        )
        assert response.status_code == 404
        print("✓ GET /api/checkout/status returns 404 for invalid session")


class TestUserAccessEndpoint:
    """Tests for GET /api/user/access endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed - skipping access tests")
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_user_access_requires_auth(self):
        """GET /api/user/access should require authentication"""
        response = requests.get(f"{BASE_URL}/api/user/access")
        assert response.status_code == 401
        print("✓ GET /api/user/access requires authentication")
    
    def test_admin_has_access(self):
        """Admin user should have full access"""
        response = requests.get(f"{BASE_URL}/api/user/access", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["has_access"] == True
        assert data["reason"] == "admin_or_free"
        print(f"✓ GET /api/user/access: admin has_access={data['has_access']}, reason={data['reason']}")


class TestAdminTransactionsEndpoint:
    """Tests for GET /api/admin/transactions endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed - skipping transactions tests")
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_transactions_requires_auth(self):
        """GET /api/admin/transactions should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/transactions")
        assert response.status_code == 403
        print("✓ GET /api/admin/transactions requires admin authentication")
    
    def test_admin_get_transactions(self):
        """GET /api/admin/transactions should return list of transactions"""
        response = requests.get(f"{BASE_URL}/api/admin/transactions", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/transactions returned {len(data)} transactions")
        
        # Verify transaction structure if any exist
        if len(data) > 0:
            txn = data[0]
            assert "transaction_id" in txn
            assert "session_id" in txn
            assert "amount" in txn
            print(f"  Transaction structure verified: {txn['transaction_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
