#!/usr/bin/env python3
"""
New Features Backend API Testing for Cooe Game Platform
Tests all NEW endpoints added in the 4th iteration:
- Win Go multi-mode support (30s, 60s, 3min, 5min)
- Aviator auto-bet features
- Leaderboard with periods and game filters
- Daily Bonus system with spin wheel
- VIP tier system and achievements
- Admin Live Monitor
- Live Feed
- Terms & Conditions
- Bet Limits
"""

import requests
import sys
import json
import time
import uuid
from datetime import datetime

class NewFeaturesAPITester:
    def __init__(self, base_url="https://play-admin-nexus.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.user_id = None

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        token = self.admin_token if use_admin else self.token
        if token:
            test_headers['Authorization'] = f'Bearer {token}'
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

    def test_authentication(self):
        """Test both user and admin authentication"""
        self.log("🔐 Testing Authentication...")
        
        # Test admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@example.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.log("✅ Admin authenticated successfully")
        else:
            return False

        # Create a test user for regular user tests
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        success, response = self.run_test(
            "Register Test User",
            "POST",
            "auth/register",
            200,
            data={"email": test_email, "password": "test123", "name": "Test User"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.log("✅ Test user created and authenticated")
            return True
        return False

    def test_leaderboard_endpoints(self):
        """Test new leaderboard endpoints with periods and game filters"""
        self.log("🏆 Testing Leaderboard Endpoints...")
        
        # Test daily leaderboard
        success, response = self.run_test(
            "Get Daily Leaderboard",
            "GET",
            "leaderboard/daily",
            200
        )
        if not success:
            return False
            
        # Test weekly leaderboard
        success, response = self.run_test(
            "Get Weekly Leaderboard",
            "GET",
            "leaderboard/weekly",
            200
        )
        if not success:
            return False
            
        # Test all-time leaderboard (using existing endpoint)
        success, response = self.run_test(
            "Get All-Time Leaderboard",
            "GET",
            "leaderboard",
            200
        )
        if not success:
            return False
            
        # Test game-specific leaderboards
        games = ['wingo', 'aviator', 'abfun', 'luckyhit', 'soccergo']
        for game in games:
            success, response = self.run_test(
                f"Get {game.title()} Leaderboard",
                "GET",
                f"leaderboard/game/{game}",
                200
            )
            if not success:
                return False
                
        return True

    def test_daily_bonus_system(self):
        """Test daily bonus and spin wheel system"""
        self.log("🎁 Testing Daily Bonus System...")
        
        # Test daily bonus status
        success, response = self.run_test(
            "Get Daily Bonus Status",
            "GET",
            "bonus/daily-status",
            200
        )
        if not success:
            return False
            
        required_fields = ['streak', 'claimed_today', 'next_reward', 'spin_available', 'rewards']
        for field in required_fields:
            if field not in response:
                self.log(f"❌ Missing field in daily bonus status: {field}", "ERROR")
                return False
                
        # Test claim daily bonus
        success, response = self.run_test(
            "Claim Daily Bonus",
            "POST",
            "bonus/claim-daily",
            200
        )
        # This might fail if already claimed today, which is expected
        if not success:
            self.log("ℹ️ Daily bonus already claimed (expected behavior)")
            
        # Test spin wheel
        success, response = self.run_test(
            "Spin Wheel",
            "POST",
            "bonus/spin-wheel",
            200
        )
        # This might fail if already spun today, which is expected
        if not success:
            self.log("ℹ️ Wheel already spun today (expected behavior)")
            
        return True

    def test_vip_system(self):
        """Test VIP tier system"""
        self.log("👑 Testing VIP System...")
        
        # Test VIP status
        success, response = self.run_test(
            "Get VIP Status",
            "GET",
            "vip/status",
            200
        )
        if not success:
            return False
            
        required_fields = ['current_tier', 'tiers', 'total_deposited']
        for field in required_fields:
            if field not in response:
                self.log(f"❌ Missing field in VIP status: {field}", "ERROR")
                return False
                
        # Check if VIP tiers are properly defined
        if 'tiers' in response and isinstance(response['tiers'], dict):
            expected_tiers = ['bronze', 'silver', 'gold', 'diamond']
            for tier in expected_tiers:
                if tier not in response['tiers']:
                    self.log(f"❌ Missing VIP tier: {tier}", "ERROR")
                    return False
                    
        return True

    def test_achievements_system(self):
        """Test achievements system"""
        self.log("🏅 Testing Achievements System...")
        
        # Test get achievements
        success, response = self.run_test(
            "Get Achievements",
            "GET",
            "achievements",
            200
        )
        if not success:
            return False
            
        if 'achievements' not in response:
            self.log("❌ Missing achievements field", "ERROR")
            return False
            
        achievements = response['achievements']
        if not isinstance(achievements, list):
            self.log("❌ Achievements should be a list", "ERROR")
            return False
            
        # Check if achievements have required fields
        if achievements:
            required_fields = ['id', 'name', 'desc', 'icon', 'earned']
            for field in required_fields:
                if field not in achievements[0]:
                    self.log(f"❌ Missing field in achievement: {field}", "ERROR")
                    return False
                    
        return True

    def test_live_feed(self):
        """Test live feed system"""
        self.log("📺 Testing Live Feed...")
        
        # Test get live feed
        success, response = self.run_test(
            "Get Live Feed",
            "GET",
            "live-feed",
            200
        )
        if not success:
            return False
            
        if 'feed' not in response:
            self.log("❌ Missing feed field", "ERROR")
            return False
            
        feed = response['feed']
        if not isinstance(feed, list):
            self.log("❌ Feed should be a list", "ERROR")
            return False
            
        # Check feed item structure if feed has items
        if feed:
            required_fields = ['game', 'player', 'amount', 'time']
            for field in required_fields:
                if field not in feed[0]:
                    self.log(f"❌ Missing field in feed item: {field}", "ERROR")
                    return False
                    
        return True

    def test_terms_system(self):
        """Test terms and conditions system"""
        self.log("📋 Testing Terms & Conditions...")
        
        # Test get terms status
        success, response = self.run_test(
            "Get Terms Status",
            "GET",
            "terms/status",
            200
        )
        if not success:
            return False
            
        if 'accepted' not in response:
            self.log("❌ Missing accepted field in terms status", "ERROR")
            return False
            
        # Test accept terms
        success, response = self.run_test(
            "Accept Terms",
            "POST",
            "terms/accept",
            200
        )
        if not success:
            return False
            
        return True

    def test_bet_limits_system(self):
        """Test bet limits system"""
        self.log("🛡️ Testing Bet Limits System...")
        
        # Test get bet limits
        success, response = self.run_test(
            "Get Bet Limits",
            "GET",
            "settings/bet-limits",
            200
        )
        if not success:
            return False
            
        if 'limits' not in response:
            self.log("❌ Missing limits field", "ERROR")
            return False
            
        # Test set bet limits
        success, response = self.run_test(
            "Set Bet Limits",
            "POST",
            "settings/bet-limits",
            200,
            data={"daily_limit": 1000, "weekly_limit": 5000, "enabled": True}
        )
        if not success:
            return False
            
        return True

    def test_admin_monitor(self):
        """Test admin live monitor"""
        self.log("📊 Testing Admin Live Monitor...")
        
        # Test admin monitor endpoint
        success, response = self.run_test(
            "Get Admin Monitor Data",
            "GET",
            "admin/monitor",
            200,
            use_admin=True
        )
        if not success:
            return False
            
        required_fields = ['active_users', 'today_bets', 'today_deposits', 'today_revenue', 'wingo_round', 'aviator_round']
        for field in required_fields:
            if field not in response:
                self.log(f"❌ Missing field in monitor data: {field}", "ERROR")
                return False
                
        return True

    def test_wingo_multi_mode(self):
        """Test Win Go multi-mode support"""
        self.log("🎯 Testing Win Go Multi-Mode...")
        
        # Test different Win Go modes
        modes = ['30s', '60s', '180s', '300s']
        for mode in modes:
            success, response = self.run_test(
                f"Get Win Go Current ({mode})",
                "GET",
                f"games/wingo/current?mode={mode}",
                200
            )
            if not success:
                return False
                
            success, response = self.run_test(
                f"Get Win Go History ({mode})",
                "GET",
                f"games/wingo/history?mode={mode}",
                200
            )
            if not success:
                return False
                
        return True

    def test_aviator_features(self):
        """Test Aviator game features"""
        self.log("✈️ Testing Aviator Features...")
        
        # Test get current aviator state
        success, response = self.run_test(
            "Get Aviator Current",
            "GET",
            "games/aviator/current",
            200
        )
        if not success:
            return False
            
        required_fields = ['phase', 'multiplier', 'round_number']
        for field in required_fields:
            if field not in response:
                self.log(f"❌ Missing field in aviator current: {field}", "ERROR")
                return False
                
        # Test get aviator history
        success, response = self.run_test(
            "Get Aviator History",
            "GET",
            "games/aviator/history",
            200
        )
        if not success:
            return False
            
        return True

def main():
    print("🚀 Starting New Features API Testing...")
    print("=" * 60)
    
    tester = NewFeaturesAPITester()
    
    # Test authentication first
    if not tester.test_authentication():
        print("\n❌ Authentication failed, stopping tests")
        return 1
    
    # Run all new feature tests
    test_functions = [
        tester.test_leaderboard_endpoints,
        tester.test_daily_bonus_system,
        tester.test_vip_system,
        tester.test_achievements_system,
        tester.test_live_feed,
        tester.test_terms_system,
        tester.test_bet_limits_system,
        tester.test_admin_monitor,
        tester.test_wingo_multi_mode,
        tester.test_aviator_features
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