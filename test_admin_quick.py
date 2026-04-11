#!/usr/bin/env python3
"""
Quick test to verify admin endpoints work with proper session management
"""

import requests

def test_admin_endpoints():
    base_url = "https://play-admin-nexus.preview.emergentagent.com"
    
    # Create a session for admin
    admin_session = requests.Session()
    
    # Admin login
    print("Testing admin login...")
    login_response = admin_session.post(
        f"{base_url}/api/auth/login",
        json={"email": "admin@example.com", "password": "admin123"}
    )
    
    if login_response.status_code == 200:
        user_data = login_response.json()
        print(f"✅ Admin login successful. Role: {user_data['user']['role']}")
        
        # Test admin dashboard
        print("Testing admin dashboard...")
        dashboard_response = admin_session.get(f"{base_url}/api/admin/dashboard")
        
        if dashboard_response.status_code == 200:
            print("✅ Admin dashboard accessible")
            dashboard_data = dashboard_response.json()
            print(f"Dashboard data: {dashboard_data}")
            return True
        else:
            print(f"❌ Admin dashboard failed: {dashboard_response.status_code}")
            print(f"Response: {dashboard_response.text}")
            return False
    else:
        print(f"❌ Admin login failed: {login_response.status_code}")
        return False

if __name__ == "__main__":
    test_admin_endpoints()