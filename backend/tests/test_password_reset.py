"""
Password Reset Flow Tests for Sijill Project
Tests: forgot-password, reset-password/validate, reset-password
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://islamic-learning-40.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "loubna.serrar@gmail.com"
TEST_PASSWORD = "Admin123!"

class TestPasswordResetFlow:
    """Tests for password reset functionality"""
    
    def test_forgot_password_existing_user(self):
        """Test forgot-password endpoint with existing user email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": TEST_EMAIL}
        )
        
        # Should always return 200 to prevent email enumeration
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Forgot password response: {data['message']}")
    
    def test_forgot_password_nonexistent_user(self):
        """Test forgot-password endpoint with non-existent email - should still return success"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "nonexistent_user_12345@test.com"}
        )
        
        # Should return 200 to prevent email enumeration attacks
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Forgot password (non-existent) response: {data['message']}")
    
    def test_forgot_password_invalid_email_format(self):
        """Test forgot-password with invalid email format - still returns 200 to prevent enumeration"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "invalid-email"}
        )
        
        # Note: API accepts invalid email format but won't find user - returns 200 for security
        # This is acceptable behavior to prevent email enumeration
        assert response.status_code == 200
        print(f"✅ Invalid email format: returns 200 (prevents enumeration)")
    
    def test_validate_reset_token_invalid(self):
        """Test validate endpoint with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/reset-password/validate",
            params={"token": "invalid_token_12345"}
        )
        
        # Should return 400 for invalid token
        assert response.status_code == 400
        data = response.json()
        print(f"✅ Invalid token correctly rejected: {data.get('detail', data)}")
    
    def test_validate_reset_token_missing(self):
        """Test validate endpoint with missing token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/reset-password/validate"
        )
        
        # Should return 422 validation error for missing parameter
        assert response.status_code == 422
        print(f"✅ Missing token correctly rejected with status 422")
    
    def test_reset_password_invalid_token(self):
        """Test reset-password with invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={
                "token": "invalid_token_xyz",
                "new_password": "NewPassword123!"
            }
        )
        
        # Should return 400 for invalid token
        assert response.status_code == 400
        data = response.json()
        print(f"✅ Reset with invalid token correctly rejected: {data.get('detail', data)}")
    
    def test_reset_password_short_password(self):
        """Test reset-password with too short password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={
                "token": "some_token",
                "new_password": "123"  # Too short
            }
        )
        
        # Should return 400 for invalid token (checked first) or short password
        assert response.status_code == 400
        print(f"✅ Short password/invalid token correctly rejected")


class TestUserRegistrationWelcomeEmail:
    """Tests for user registration with welcome email"""
    
    def test_register_new_user_format(self):
        """Test registration endpoint format"""
        # Generate unique test email
        test_email = f"test_user_{int(time.time())}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "TestPassword123!",
                "name": "Test User Registration"
            }
        )
        
        # Should return 200 with token and user
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_email
        print(f"✅ Registration successful for: {test_email}")
        print(f"   Welcome email should be sent (if SMTP configured)")
    
    def test_register_existing_user(self):
        """Test registration with existing email should fail"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": TEST_EMAIL,
                "password": "SomePassword123",
                "name": "Duplicate Test"
            }
        )
        
        # Should return 400 for existing email
        assert response.status_code == 400
        print(f"✅ Duplicate registration correctly rejected")


class TestLoginFlow:
    """Tests to verify login still works"""
    
    def test_login_valid_credentials(self):
        """Test login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✅ Login successful for: {TEST_EMAIL}")
    
    def test_login_invalid_password(self):
        """Test login with invalid password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": TEST_EMAIL,
                "password": "WrongPassword123"
            }
        )
        
        assert response.status_code == 401
        print(f"✅ Invalid password correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
