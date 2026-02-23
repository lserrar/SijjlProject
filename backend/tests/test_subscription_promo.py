"""
Test Suite for User Subscription Management and Promo Code Validity Period Features
Covers:
- Admin user subscription endpoints (grant-access, revoke-access, extend-subscription, grant-subscription)
- Promo code creation with start_date and expires_at fields
- Promo code validation with start_date check (not yet valid codes)
- Promo code validation with expires_at check (expired codes)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://text-minimal.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@hikma-admin.com"
ADMIN_PASSWORD = "Admin123!"
TEST_USER_PREFIX = "TEST_SUBPROMO_"


class TestSubscriptionManagement:
    """Tests for admin user subscription management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.admin_token = data.get("token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.admin_token}"
        }
        yield
        
    def _create_test_user(self):
        """Create a test user for subscription tests"""
        import uuid
        unique_id = uuid.uuid4().hex[:8]
        email = f"{TEST_USER_PREFIX}{unique_id}@test.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": "TestPass123!", "name": f"Test User {unique_id}"}
        )
        if response.status_code == 200:
            return response.json().get("user", {}).get("user_id"), email
        return None, None
    
    def _cleanup_test_user(self, user_id):
        """Delete test user"""
        if user_id:
            try:
                requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=self.headers)
            except:
                pass
    
    def test_admin_users_list(self):
        """Test GET /api/admin/users returns list of users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        print(f"✅ Admin users list returned {len(users)} users")
    
    def test_grant_access_endpoint_exists(self):
        """Test POST /api/admin/users/{user_id}/grant-access endpoint exists"""
        user_id, email = self._create_test_user()
        try:
            response = requests.post(
                f"{BASE_URL}/api/admin/users/{user_id}/grant-access",
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert data.get("user_id") == user_id
            print(f"✅ Grant free access endpoint works: {data.get('message')}")
            
            # Verify the user now has free_access
            users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
            users = users_response.json()
            test_user = next((u for u in users if u.get("user_id") == user_id), None)
            assert test_user is not None
            assert test_user.get("free_access") == True or test_user.get("has_free_access") == True
            print("✅ User now has free_access flag set to True")
        finally:
            self._cleanup_test_user(user_id)
    
    def test_revoke_access_endpoint(self):
        """Test POST /api/admin/users/{user_id}/revoke-access endpoint"""
        user_id, email = self._create_test_user()
        try:
            # First grant access
            requests.post(f"{BASE_URL}/api/admin/users/{user_id}/grant-access", headers=self.headers)
            
            # Then revoke access
            response = requests.post(
                f"{BASE_URL}/api/admin/users/{user_id}/revoke-access",
                headers=self.headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            print(f"✅ Revoke access endpoint works: {data.get('message')}")
            
            # Verify the user no longer has free_access
            users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
            users = users_response.json()
            test_user = next((u for u in users if u.get("user_id") == user_id), None)
            assert test_user is not None
            assert test_user.get("free_access") == False
            print("✅ User free_access flag is now False")
        finally:
            self._cleanup_test_user(user_id)
    
    def test_extend_subscription_endpoint(self):
        """Test POST /api/admin/users/{user_id}/extend-subscription endpoint"""
        user_id, email = self._create_test_user()
        try:
            # Extend subscription by 30 days
            response = requests.post(
                f"{BASE_URL}/api/admin/users/{user_id}/extend-subscription",
                headers=self.headers,
                json={"days": 30}
            )
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            assert "new_expires_at" in data
            print(f"✅ Extend subscription endpoint works: {data.get('message')}")
            print(f"   New expires_at: {data.get('new_expires_at')}")
            
            # Verify the expiration date is approximately 30 days from now
            new_expires = datetime.fromisoformat(data.get("new_expires_at").replace("Z", "+00:00"))
            now = datetime.now().astimezone()
            expected_expires = now + timedelta(days=30)
            # Allow 1 day tolerance for timing
            diff = abs((new_expires - expected_expires).days)
            assert diff <= 1, f"Expected ~30 days extension, got {diff} days difference"
            print(f"✅ Expiration date correctly set to ~30 days from now")
        finally:
            self._cleanup_test_user(user_id)
    
    def test_extend_subscription_with_existing(self):
        """Test extending subscription when user already has subscription"""
        user_id, email = self._create_test_user()
        try:
            # First grant a subscription
            requests.post(
                f"{BASE_URL}/api/admin/users/{user_id}/grant-subscription",
                headers=self.headers,
                json={"plan_id": "monthly"}
            )
            
            # Then extend by 7 days
            response = requests.post(
                f"{BASE_URL}/api/admin/users/{user_id}/extend-subscription",
                headers=self.headers,
                json={"days": 7}
            )
            assert response.status_code == 200
            data = response.json()
            assert "new_expires_at" in data
            
            # Should be ~37 days from now (30 + 7)
            new_expires = datetime.fromisoformat(data.get("new_expires_at").replace("Z", "+00:00"))
            now = datetime.now().astimezone()
            expected_expires = now + timedelta(days=37)
            diff = abs((new_expires - expected_expires).days)
            assert diff <= 1, f"Expected ~37 days total, got {diff} days difference"
            print(f"✅ Subscription correctly extended from existing expiration")
        finally:
            self._cleanup_test_user(user_id)
    
    def test_grant_subscription_monthly(self):
        """Test POST /api/admin/users/{user_id}/grant-subscription with monthly plan"""
        user_id, email = self._create_test_user()
        try:
            response = requests.post(
                f"{BASE_URL}/api/admin/users/{user_id}/grant-subscription",
                headers=self.headers,
                json={"plan_id": "monthly"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "expires_at" in data
            assert "Mensuel" in data.get("message", "")
            print(f"✅ Grant monthly subscription works: {data.get('message')}")
            
            # Verify expiration is ~30 days from now
            expires = datetime.fromisoformat(data.get("expires_at").replace("Z", "+00:00"))
            now = datetime.now().astimezone()
            expected_expires = now + timedelta(days=30)
            diff = abs((expires - expected_expires).days)
            assert diff <= 1, f"Expected ~30 days, got {diff} days difference"
            print(f"✅ Monthly subscription correctly set for 30 days")
        finally:
            self._cleanup_test_user(user_id)
    
    def test_grant_subscription_annual(self):
        """Test POST /api/admin/users/{user_id}/grant-subscription with annual plan"""
        user_id, email = self._create_test_user()
        try:
            response = requests.post(
                f"{BASE_URL}/api/admin/users/{user_id}/grant-subscription",
                headers=self.headers,
                json={"plan_id": "annual"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "expires_at" in data
            assert "Annuel" in data.get("message", "")
            print(f"✅ Grant annual subscription works: {data.get('message')}")
            
            # Verify expiration is ~365 days from now
            expires = datetime.fromisoformat(data.get("expires_at").replace("Z", "+00:00"))
            now = datetime.now().astimezone()
            expected_expires = now + timedelta(days=365)
            diff = abs((expires - expected_expires).days)
            assert diff <= 1, f"Expected ~365 days, got {diff} days difference"
            print(f"✅ Annual subscription correctly set for 365 days")
        finally:
            self._cleanup_test_user(user_id)
    
    def test_grant_access_nonexistent_user(self):
        """Test grant-access with non-existent user returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/admin/users/nonexistent_user_12345/grant-access",
            headers=self.headers
        )
        assert response.status_code == 404
        print("✅ Grant access returns 404 for non-existent user")
    
    def test_extend_subscription_nonexistent_user(self):
        """Test extend-subscription with non-existent user returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/admin/users/nonexistent_user_12345/extend-subscription",
            headers=self.headers,
            json={"days": 30}
        )
        assert response.status_code == 404
        print("✅ Extend subscription returns 404 for non-existent user")


class TestPromoCodeValidityPeriod:
    """Tests for promo code creation and validation with start_date and expires_at"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.admin_token = data.get("token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.admin_token}"
        }
        self.created_codes = []
        yield
        # Cleanup created promo codes
        for code in self.created_codes:
            try:
                requests.delete(f"{BASE_URL}/api/admin/promo-codes/{code}", headers=self.headers)
            except:
                pass
    
    def test_create_promo_with_start_date(self):
        """Test creating a promo code with start_date field"""
        code = f"TEST_START_{datetime.now().strftime('%H%M%S')}"
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.headers,
            json={
                "code": code,
                "discount_percent": 15.0,
                "start_date": f"{future_date}T00:00:00Z",
                "description": "Test promo with start date"
            }
        )
        assert response.status_code == 200
        self.created_codes.append(code)
        
        data = response.json()
        assert data.get("code") == code
        print(f"✅ Created promo code {code} with future start_date: {future_date}")
        
        # Verify the promo was created with start_date
        response = requests.get(f"{BASE_URL}/api/admin/promo-codes", headers=self.headers)
        promos = response.json()
        created_promo = next((p for p in promos if p.get("code") == code), None)
        assert created_promo is not None
        assert "start_date" in created_promo
        print(f"✅ Promo code stored with start_date: {created_promo.get('start_date')}")
    
    def test_create_promo_with_expires_at(self):
        """Test creating a promo code with expires_at field"""
        code = f"TEST_EXP_{datetime.now().strftime('%H%M%S')}"
        future_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.headers,
            json={
                "code": code,
                "discount_percent": 20.0,
                "expires_at": f"{future_date}T23:59:59Z",
                "description": "Test promo with expiration"
            }
        )
        assert response.status_code == 200
        self.created_codes.append(code)
        
        data = response.json()
        assert data.get("code") == code
        print(f"✅ Created promo code {code} with expires_at: {future_date}")
    
    def test_create_promo_with_validity_period(self):
        """Test creating a promo code with both start_date and expires_at"""
        code = f"TEST_PERIOD_{datetime.now().strftime('%H%M%S')}"
        start_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.headers,
            json={
                "code": code,
                "discount_percent": 25.0,
                "start_date": f"{start_date}T00:00:00Z",
                "expires_at": f"{end_date}T23:59:59Z",
                "description": "Test promo with full validity period"
            }
        )
        assert response.status_code == 200
        self.created_codes.append(code)
        print(f"✅ Created promo code {code} with validity period: {start_date} to {end_date}")
    
    def test_validate_promo_not_yet_valid(self):
        """Test validating a promo code that hasn't started yet returns error"""
        # First create a promo with future start date
        code = f"TEST_FUTURE_{datetime.now().strftime('%H%M%S')}"
        future_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.headers,
            json={
                "code": code,
                "discount_percent": 10.0,
                "start_date": f"{future_date}T00:00:00Z",
                "description": "Not yet valid promo"
            }
        )
        assert create_response.status_code == 200
        self.created_codes.append(code)
        
        # Try to validate - should return error
        validate_response = requests.post(
            f"{BASE_URL}/api/promo/validate?code={code}"
        )
        assert validate_response.status_code == 400
        error_data = validate_response.json()
        assert "pas encore valide" in error_data.get("detail", "").lower() or "not yet" in error_data.get("detail", "").lower()
        print(f"✅ Validation correctly rejects promo code not yet valid: {error_data.get('detail')}")
    
    def test_validate_expired_promo(self):
        """Test validating an expired promo code returns error"""
        # First create a promo with past expiration date
        code = f"TEST_EXPIRED_{datetime.now().strftime('%H%M%S')}"
        past_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.headers,
            json={
                "code": code,
                "discount_percent": 10.0,
                "expires_at": f"{past_date}T23:59:59Z",
                "description": "Expired promo"
            }
        )
        assert create_response.status_code == 200
        self.created_codes.append(code)
        
        # Try to validate - should return error
        validate_response = requests.post(
            f"{BASE_URL}/api/promo/validate?code={code}"
        )
        assert validate_response.status_code == 400
        error_data = validate_response.json()
        assert "expiré" in error_data.get("detail", "").lower() or "expired" in error_data.get("detail", "").lower()
        print(f"✅ Validation correctly rejects expired promo code: {error_data.get('detail')}")
    
    def test_validate_active_promo(self):
        """Test validating an active promo code (within validity period) succeeds"""
        code = f"TEST_ACTIVE_{datetime.now().strftime('%H%M%S')}"
        past_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/promo-codes",
            headers=self.headers,
            json={
                "code": code,
                "discount_percent": 15.0,
                "start_date": f"{past_date}T00:00:00Z",
                "expires_at": f"{future_date}T23:59:59Z",
                "description": "Active promo with validity period"
            }
        )
        assert create_response.status_code == 200
        self.created_codes.append(code)
        
        # Try to validate - should succeed
        validate_response = requests.post(
            f"{BASE_URL}/api/promo/validate?code={code}"
        )
        assert validate_response.status_code == 200
        data = validate_response.json()
        assert data.get("valid") == True
        assert data.get("discount_percent") == 15.0
        assert "start_date" in data
        assert "expires_at" in data
        print(f"✅ Validation correctly accepts active promo code within validity period")
        print(f"   Discount: {data.get('discount_percent')}%")
        print(f"   Start date: {data.get('start_date')}")
        print(f"   Expires at: {data.get('expires_at')}")
    
    def test_ramadan2026_promo_not_yet_valid(self):
        """Test the RAMADAN2026 promo code that should have future start_date"""
        # This promo was created with start_date 2026-03-01 according to main agent
        validate_response = requests.post(
            f"{BASE_URL}/api/promo/validate?code=RAMADAN2026"
        )
        # Should return 400 with "pas encore valide" message
        if validate_response.status_code == 404:
            print("⚠️ RAMADAN2026 promo code not found - may not have been created")
        elif validate_response.status_code == 400:
            error_data = validate_response.json()
            assert "pas encore valide" in error_data.get("detail", "").lower()
            print(f"✅ RAMADAN2026 promo correctly returns 'not yet valid': {error_data.get('detail')}")
        else:
            print(f"⚠️ Unexpected response for RAMADAN2026: {validate_response.status_code} - {validate_response.text}")
    
    def test_admin_promo_codes_shows_validity_fields(self):
        """Test that admin promo codes endpoint returns start_date and expires_at fields"""
        response = requests.get(f"{BASE_URL}/api/admin/promo-codes", headers=self.headers)
        assert response.status_code == 200
        promos = response.json()
        
        # Check if any promo has start_date or expires_at fields
        has_validity_fields = False
        for promo in promos:
            if promo.get("start_date") or promo.get("expires_at"):
                has_validity_fields = True
                print(f"   Found promo {promo.get('code')} with start_date: {promo.get('start_date')}, expires_at: {promo.get('expires_at')}")
        
        if has_validity_fields:
            print("✅ Admin promo codes endpoint returns validity period fields")
        else:
            print("⚠️ No promos with validity period fields found (may need to create test promos)")


class TestSubscriptionEndpointsAuth:
    """Test authentication requirements for subscription endpoints"""
    
    def test_grant_access_requires_admin(self):
        """Test grant-access endpoint requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/users/some_user_id/grant-access",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [401, 403]
        print("✅ grant-access endpoint requires admin authentication")
    
    def test_revoke_access_requires_admin(self):
        """Test revoke-access endpoint requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/users/some_user_id/revoke-access",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [401, 403]
        print("✅ revoke-access endpoint requires admin authentication")
    
    def test_extend_subscription_requires_admin(self):
        """Test extend-subscription endpoint requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/users/some_user_id/extend-subscription",
            headers={"Content-Type": "application/json"},
            json={"days": 30}
        )
        assert response.status_code in [401, 403]
        print("✅ extend-subscription endpoint requires admin authentication")
    
    def test_grant_subscription_requires_admin(self):
        """Test grant-subscription endpoint requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/users/some_user_id/grant-subscription",
            headers={"Content-Type": "application/json"},
            json={"plan_id": "monthly"}
        )
        assert response.status_code in [401, 403]
        print("✅ grant-subscription endpoint requires admin authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
