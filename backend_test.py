#!/usr/bin/env python3
"""
Admin Dashboard Backend API Testing for Cooe Game Platform
Tests all admin endpoints for the redesigned admin dashboard
"""

import requests
import sys
import json
import time
import uuid
from datetime import datetime

class AdminDashboardAPITester:
    def __init__(self, base_url="https://play-admin-nexus.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                self.log(f"❌ Failed - Expected {expected_status}, got {response.status_code}", "ERROR")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}", "ERROR")
                except:
                    self.log(f"   Response: {response.text[:200]}", "ERROR")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            self.log(f"❌ Failed - Error: {str(e)}", "ERROR")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login and get token"""
        self.log("🔐 Testing Admin Authentication...")
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@example.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log("✅ Admin authenticated successfully")
            return True
        return False

    def test_admin_overview(self):
        """Test admin overview/dashboard"""
        self.log("📊 Testing Admin Overview...")
        success, response = self.run_test(
            "Admin Reports Overview",
            "GET",
            "admin/reports/overview",
            200
        )
        if success:
            required_fields = ['total_users', 'platform_revenue', 'total_deposits', 'pending_withdrawals']
            for field in required_fields:
                if field not in response:
                    self.log(f"❌ Missing field: {field}", "ERROR")
                    return False
            self.log(f"✅ Overview data complete: {len(response)} fields")
        return success

    def test_user_management(self):
        """Test user management endpoints"""
        self.log("👥 Testing User Management...")
        
        # Get users list
        success, response = self.run_test(
            "Get Users List",
            "GET",
            "admin/users?limit=10",
            200
        )
        if not success:
            return False
            
        users = response.get('users', [])
        if not users:
            self.log("⚠️ No users found for testing user management")
            return True
            
        user_id = users[0].get('_id')
        if not user_id:
            self.log("❌ No user ID found", "ERROR")
            return False
            
        # Test user detail
        success, _ = self.run_test(
            "Get User Detail",
            "GET",
            f"admin/users/{user_id}",
            200
        )
        if not success:
            return False
            
        # Test balance adjustment
        success, _ = self.run_test(
            "Adjust User Balance",
            "POST",
            f"admin/users/{user_id}/balance",
            200,
            data={"amount": 10, "reason": "Test adjustment"}
        )
        if not success:
            return False
            
        # Test ban/unban
        success, _ = self.run_test(
            "Ban/Unban User",
            "POST",
            f"admin/users/{user_id}/ban",
            200
        )
        
        return success

    def test_payment_management(self):
        """Test payment and withdrawal management"""
        self.log("💳 Testing Payment Management...")
        
        # Test pending withdrawals
        success, _ = self.run_test(
            "Get Pending Withdrawals",
            "GET",
            "admin/pending-withdrawals",
            200
        )
        if not success:
            return False
            
        # Test all transactions
        success, _ = self.run_test(
            "Get All Transactions",
            "GET",
            "admin/transactions?limit=20",
            200
        )
        
        return success

    def test_game_controls(self):
        """Test game settings and controls"""
        self.log("🎮 Testing Game Controls...")
        
        # Get game settings
        success, response = self.run_test(
            "Get Game Settings",
            "GET",
            "admin/game-settings",
            200
        )
        if not success:
            return False
            
        # Test updating game settings
        success, _ = self.run_test(
            "Update Game Settings",
            "POST",
            "admin/game-settings",
            200,
            data={"game_id": "wingo", "house_edge": 2.5, "min_bet": 10, "max_bet": 5000}
        )
        if not success:
            return False
            
        # Get game stats
        success, _ = self.run_test(
            "Get Game Stats",
            "GET",
            "admin/game-stats",
            200
        )
        
        return success

    def test_promotions(self):
        """Test promo codes management"""
        self.log("🎁 Testing Promotions...")
        
        # Get promo codes
        success, _ = self.run_test(
            "Get Promo Codes",
            "GET",
            "admin/promo-codes",
            200
        )
        if not success:
            return False
            
        # Create promo code
        test_code = f"TEST{datetime.now().strftime('%H%M%S')}"
        success, response = self.run_test(
            "Create Promo Code",
            "POST",
            "admin/promo-codes",
            200,
            data={
                "code": test_code,
                "bonus_type": "deposit_percent",
                "bonus_value": 10,
                "min_deposit": 100,
                "max_uses": 50
            }
        )
        if not success:
            return False
            
        # Delete the test promo code
        if 'promo_code' in response and 'id' in response['promo_code']:
            promo_id = response['promo_code']['id']
            success, _ = self.run_test(
                "Delete Promo Code",
                "DELETE",
                f"admin/promo-codes/{promo_id}",
                200
            )
        
        return success

    def test_announcements(self):
        """Test announcements management"""
        self.log("📢 Testing Announcements...")
        
        # Get announcements
        success, _ = self.run_test(
            "Get Announcements",
            "GET",
            "admin/announcements",
            200
        )
        if not success:
            return False
            
        # Create announcement
        success, response = self.run_test(
            "Create Announcement",
            "POST",
            "admin/announcements",
            200,
            data={
                "title": "Test Announcement",
                "message": "This is a test announcement",
                "type": "marquee",
                "active": True
            }
        )
        if not success:
            return False
            
        # Toggle and delete the test announcement
        if 'announcement' in response and 'id' in response['announcement']:
            ann_id = response['announcement']['id']
            
            # Toggle announcement
            success, _ = self.run_test(
                "Toggle Announcement",
                "PUT",
                f"admin/announcements/{ann_id}/toggle",
                200
            )
            if not success:
                return False
                
            # Delete announcement
            success, _ = self.run_test(
                "Delete Announcement",
                "DELETE",
                f"admin/announcements/{ann_id}",
                200
            )
        
        return success

    def test_kyc_management(self):
        """Test KYC management"""
        self.log("🛡️ Testing KYC Management...")
        
        # Get KYC requests
        success, response = self.run_test(
            "Get KYC Requests",
            "GET",
            "admin/kyc-requests",
            200
        )
        if not success:
            return False
            
        # If there are KYC requests, test approve/reject (but don't actually do it)
        kyc_requests = response.get('kyc_requests', [])
        if kyc_requests:
            self.log(f"✅ Found {len(kyc_requests)} KYC requests")
        else:
            self.log("ℹ️ No KYC requests to test approve/reject")
        
        return success

    def test_reports(self):
        """Test reports and analytics"""
        self.log("📈 Testing Reports...")
        
        # Already tested overview in test_admin_overview
        # Test game stats again for reports section
        success, _ = self.run_test(
            "Get Game Stats for Reports",
            "GET",
            "admin/game-stats",
            200
        )
        
        return success

def main():
    print("🚀 Starting Admin Dashboard API Testing...")
    print("=" * 60)
    
    tester = AdminDashboardAPITester()
    
    # Test authentication first
    if not tester.test_admin_login():
        print("\n❌ Admin authentication failed, stopping tests")
        return 1
    
    # Run all admin tests
    test_functions = [
        tester.test_admin_overview,
        tester.test_user_management,
        tester.test_payment_management,
        tester.test_game_controls,
        tester.test_promotions,
        tester.test_announcements,
        tester.test_kyc_management,
        tester.test_reports
    ]
    
    for test_func in test_functions:
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test function {test_func.__name__} failed with error: {e}")
            tester.failed_tests.append(f"{test_func.__name__}: {str(e)}")
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests ({len(tester.failed_tests)}):")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"  {i}. {failure}")
    else:
        print("\n✅ All tests passed!")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())