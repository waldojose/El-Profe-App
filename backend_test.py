import requests
import sys
import json
from datetime import datetime

class ProfessorAppTester:
    def __init__(self, base_url="https://elprofe-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"test": name, "error": details})

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        data = {
            "email": test_email,
            "password": "TestPass123!",
            "artist_name": "Test Artist"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/register", json=data)
            success = response.status_code == 200
            
            if success:
                result = response.json()
                self.token = result.get("token")
                self.user_id = result.get("user", {}).get("id")
                
            self.log_test("User Registration", success, 
                         f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("User Registration", False, str(e))
            return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        data = {
            "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
            "password": "TestPass123!"
        }
        
        try:
            # First register a user
            requests.post(f"{self.api_url}/auth/register", json=data)
            
            # Then try to login
            response = requests.post(f"{self.api_url}/auth/login", json=data)
            success = response.status_code == 200
            
            if success:
                result = response.json()
                self.token = result.get("token")
                self.user_id = result.get("user", {}).get("id")
                
            self.log_test("User Login", success, 
                         f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("User Login", False, str(e))
            return False

    def test_get_user_profile(self):
        """Test getting user profile"""
        if not self.token:
            self.log_test("Get User Profile", False, "No token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.api_url}/auth/me", headers=headers)
            success = response.status_code == 200
            
            self.log_test("Get User Profile", success, 
                         f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("Get User Profile", False, str(e))
            return False

    def test_complete_profile(self):
        """Test profile completion"""
        if not self.token:
            self.log_test("Complete Profile", False, "No token available")
            return False
            
        data = {
            "legal_name": "John Doe",
            "artist_name": "J Doe",
            "country": "United States",
            "pro_affiliation": "ASCAP",
            "publisher": "Test Publisher",
            "role": "writer"
        }
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.post(f"{self.api_url}/profile/complete", json=data, headers=headers)
            success = response.status_code == 200
            
            self.log_test("Complete Profile", success, 
                         f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("Complete Profile", False, str(e))
            return False

    def test_create_song(self):
        """Test song creation"""
        if not self.token:
            self.log_test("Create Song", False, "No token available")
            return False
            
        data = {"title": "Test Song"}
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.post(f"{self.api_url}/songs", json=data, headers=headers)
            success = response.status_code == 200
            
            if success:
                self.song_id = response.json().get("id")
                
            self.log_test("Create Song", success, 
                         f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("Create Song", False, str(e))
            return False

    def test_get_songs(self):
        """Test getting user songs"""
        if not self.token:
            self.log_test("Get Songs", False, "No token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{self.api_url}/songs", headers=headers)
            success = response.status_code == 200
            
            self.log_test("Get Songs", success, 
                         f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("Get Songs", False, str(e))
            return False

    def test_free_plan_limits(self):
        """Test free plan song creation limits with fresh user"""
        # Create a fresh user for this test to avoid conflicts with previous song creations
        test_email = f"limits_{datetime.now().strftime('%H%M%S')}@example.com"
        reg_data = {
            "email": test_email,
            "password": "TestPass123!",
            "artist_name": "Limits Test"
        }
        
        try:
            # Register new user
            reg_response = requests.post(f"{self.api_url}/auth/register", json=reg_data)
            if reg_response.status_code != 200:
                self.log_test("Free Plan Limits", False, "Failed to register test user")
                return False
                
            token = reg_response.json().get("token")
            headers = {"Authorization": f"Bearer {token}"}
            
            # Complete profile
            profile_data = {
                "legal_name": "Limits Test User",
                "artist_name": "Limits Test",
                "country": "United States", 
                "pro_affiliation": "ASCAP",
                "role": "writer"
            }
            profile_response = requests.post(f"{self.api_url}/profile/complete", json=profile_data, headers=headers)
            if profile_response.status_code != 200:
                self.log_test("Free Plan Limits", False, "Failed to complete profile")
                return False
            
            # Try to create 4 songs (should fail on 4th)
            for i in range(4):
                data = {"title": f"Limits Test Song {i+1}"}
                response = requests.post(f"{self.api_url}/songs", json=data, headers=headers)
                
                if i < 3:
                    # First 3 should succeed
                    if response.status_code != 200:
                        self.log_test("Free Plan Limits", False, f"Song {i+1} creation failed unexpectedly")
                        return False
                else:
                    # 4th should fail
                    success = response.status_code == 403
                    self.log_test("Free Plan Limits", success, 
                                 f"4th song status: {response.status_code}" if not success else "")
                    return success
            
            # If we get here, all 4 songs were created (which shouldn't happen)
            self.log_test("Free Plan Limits", False, "All 4 songs were created - limit not enforced")
            return False
                    
        except Exception as e:
            self.log_test("Free Plan Limits", False, str(e))
            return False

    def test_upgrade_to_pro(self):
        """Test Pro upgrade (mock payment)"""
        if not self.token:
            self.log_test("Upgrade to Pro", False, "No token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.post(f"{self.api_url}/subscription/upgrade", headers=headers)
            success = response.status_code == 200
            
            self.log_test("Upgrade to Pro", success, 
                         f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("Upgrade to Pro", False, str(e))
            return False

    def test_synonyms_tool(self):
        """Test synonyms functionality"""
        try:
            response = requests.get(f"{self.api_url}/synonyms/love")
            success = response.status_code == 200
            
            if success:
                result = response.json()
                success = "synonyms" in result and len(result["synonyms"]) > 0
                
            self.log_test("Synonyms Tool", success, 
                         f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("Synonyms Tool", False, str(e))
            return False

    def test_contribution_logging(self):
        """Test contribution tracking"""
        if not self.token or not hasattr(self, 'song_id'):
            self.log_test("Contribution Logging", False, "No token or song_id available")
            return False
            
        data = {
            "song_id": self.song_id,
            "action": "insert",
            "content": "test lyrics",
            "position": 0,
            "chars_added": 11,
            "chars_deleted": 0
        }
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.post(f"{self.api_url}/contributions", json=data, headers=headers)
            success = response.status_code == 200
            
            self.log_test("Contribution Logging", success, 
                         f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("Contribution Logging", False, str(e))
            return False

    def test_split_management_pro_required(self):
        """Test that split management requires Pro"""
        if not self.token or not hasattr(self, 'song_id'):
            self.log_test("Split Management (Pro Required)", False, "No token or song_id available")
            return False
            
        data = {
            "song_id": self.song_id,
            "splits": [{"user_id": self.user_id, "percentage": 100}]
        }
        
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.post(f"{self.api_url}/splits", json=data, headers=headers)
            # Should fail with 403 for free users
            success = response.status_code == 403
            
            self.log_test("Split Management (Pro Required)", success, 
                         f"Status: {response.status_code}" if not success else "")
            return success
        except Exception as e:
            self.log_test("Split Management (Pro Required)", False, str(e))
            return False

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Professor App Backend Tests")
        print("=" * 50)
        
        # Authentication tests
        if not self.test_user_registration():
            return False
            
        if not self.test_user_login():
            return False
            
        if not self.test_get_user_profile():
            return False
            
        # Profile completion
        if not self.test_complete_profile():
            return False
            
        # Song management
        if not self.test_create_song():
            return False
            
        if not self.test_get_songs():
            return False
            
        # Free plan limits
        if not self.test_free_plan_limits():
            return False
            
        # Pro upgrade
        if not self.test_upgrade_to_pro():
            return False
            
        # Tools and features
        if not self.test_synonyms_tool():
            return False
            
        if not self.test_contribution_logging():
            return False
            
        if not self.test_split_management_pro_required():
            return False
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run}")
        
        if self.failed_tests:
            print("\n❌ Failed tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['error']}")
        
        return len(self.failed_tests) == 0

def main():
    tester = ProfessorAppTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())