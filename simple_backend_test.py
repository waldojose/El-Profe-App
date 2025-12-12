import requests
import json
from datetime import datetime

# Test configuration
BASE_URL = "https://elprofe-app.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

def test_song_creation_flow():
    """Test the complete song creation flow with limits"""
    
    # 1. Register a new user
    test_email = f"test_{datetime.now().strftime('%H%M%S%f')[:10]}@example.com"
    register_data = {
        "email": test_email,
        "password": "TestPass123!",
        "artist_name": "Test Artist"
    }
    
    print(f"🔍 Testing with email: {test_email}")
    
    # Register
    response = requests.post(f"{API_URL}/auth/register", json=register_data)
    print(f"Registration: {response.status_code}")
    if response.status_code != 200:
        print(f"Registration failed: {response.text}")
        return False
        
    token = response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Complete profile (required for song creation)
    profile_data = {
        "legal_name": "John Doe",
        "artist_name": "J Doe", 
        "country": "United States",
        "pro_affiliation": "ASCAP",
        "role": "writer"
    }
    
    response = requests.post(f"{API_URL}/profile/complete", json=profile_data, headers=headers)
    print(f"Profile completion: {response.status_code}")
    if response.status_code != 200:
        print(f"Profile completion failed: {response.text}")
        return False
    
    # 3. Test song creation limits
    songs_created = 0
    for i in range(5):  # Try to create 5 songs
        song_data = {"title": f"Test Song {i+1}"}
        response = requests.post(f"{API_URL}/songs", json=song_data, headers=headers)
        
        print(f"Song {i+1} creation: {response.status_code}")
        
        if response.status_code == 200:
            songs_created += 1
            print(f"  ✅ Song {i+1} created successfully")
        elif response.status_code == 403:
            print(f"  ⚠️  Song {i+1} blocked by free plan limit")
            break
        else:
            print(f"  ❌ Song {i+1} failed with unexpected status: {response.text}")
            return False
    
    print(f"\n📊 Total songs created: {songs_created}")
    
    # 4. Test Pro upgrade
    response = requests.post(f"{API_URL}/subscription/upgrade", headers=headers)
    print(f"Pro upgrade: {response.status_code}")
    
    if response.status_code == 200:
        print("  ✅ Pro upgrade successful")
        
        # Try creating another song after upgrade
        song_data = {"title": "Post-Pro Song"}
        response = requests.post(f"{API_URL}/songs", json=song_data, headers=headers)
        print(f"Post-Pro song creation: {response.status_code}")
        
        if response.status_code == 200:
            print("  ✅ Song creation after Pro upgrade successful")
        else:
            print(f"  ❌ Song creation after Pro upgrade failed: {response.text}")
    
    # 5. Test other endpoints
    print("\n🔍 Testing other endpoints...")
    
    # Get songs
    response = requests.get(f"{API_URL}/songs", headers=headers)
    print(f"Get songs: {response.status_code}")
    
    # Test synonyms
    response = requests.get(f"{API_URL}/synonyms/love")
    print(f"Synonyms: {response.status_code}")
    
    return True

if __name__ == "__main__":
    print("🚀 Starting Simple Backend Test")
    print("=" * 40)
    
    success = test_song_creation_flow()
    
    if success:
        print("\n✅ All tests completed successfully!")
    else:
        print("\n❌ Tests failed!")