#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Cooe Game Platform
Tests all auth, game, wallet, admin, and payment endpoints
"""

import requests
import sys
import json
import time
import uuid
from datetime import datetime

class CooeGameAPITester:
    def __init__(self, base_url="https://play-admin-nexus.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_session = requests.Session()  # Separate session for admin
        self.admin_token = None
        self.user_token = None
        self.test_user_email = f"test_{int(time.time())}@example.com"
        self.test_user_password = "TestPass123!"
        self.test_user_name = "Test User"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)

        # Use appropriate session
        session = self.admin_session if use_admin else self.session

        self.tests_run += 1
        self.log(f"Testing {name}...")
        
        try:
            if method == 'GET':
                response = session.get(url, headers=test_headers)
            elif method == 'POST':
                response = session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}", "PASS")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}", "FAIL")
                self.log(f"Response: {response.text[:200]}", "ERROR")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}", "ERROR")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@example.com", "password": "admin123"},
            use_admin=True
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            # Check if admin role is properly set
            if response.get('user', {}).get('role') == 'admin':
                self.log("Admin token acquired with admin role", "SUCCESS")
                return True
            else:
                self.log(f"Admin login successful but role is: {response.get('user', {}).get('role')}", "ERROR")
        return False

    def test_user_registration(self):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "email": self.test_user_email,
                "password": self.test_user_password,
                "name": self.test_user_name
            }
        )
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            self.log("User token acquired", "SUCCESS")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.test_user_email, "password": self.test_user_password}
        )
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            return True
        return False

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        return self.run_test("Auth Me", "GET", "auth/me", 200)[0]

    def test_auth_logout(self):
        """Test logout"""
        return self.run_test("Logout", "POST", "auth/logout", 200)[0]

    def test_games_list(self):
        """Test games list endpoint"""
        success, response = self.run_test("Games List", "GET", "games/list", 200)
        if success and 'games' in response:
            games = response['games']
            expected_games = ['wingo', 'aviator', 'abfun', 'luckyhit', 'soccergo']
            found_games = [g['id'] for g in games]
            if all(game in found_games for game in expected_games):
                self.log("All 5 games found in list", "SUCCESS")
                return True
            else:
                self.log(f"Missing games. Found: {found_games}", "ERROR")
        return False

    def test_wallet_balance(self):
        """Test wallet balance endpoint"""
        return self.run_test("Wallet Balance", "GET", "wallet/balance", 200)[0]

    def test_wallet_transactions(self):
        """Test wallet transactions endpoint"""
        return self.run_test("Wallet Transactions", "GET", "wallet/transactions", 200)[0]

    def test_wingo_current(self):
        """Test Win Go current round"""
        return self.run_test("Win Go Current", "GET", "games/wingo/current", 200)[0]

    def test_wingo_history(self):
        """Test Win Go history"""
        return self.run_test("Win Go History", "GET", "games/wingo/history", 200)[0]

    def test_aviator_current(self):
        """Test Aviator current state"""
        return self.run_test("Aviator Current", "GET", "games/aviator/current", 200)[0]

    def test_aviator_history(self):
        """Test Aviator history"""
        return self.run_test("Aviator History", "GET", "games/aviator/history", 200)[0]

    def test_instant_game_play(self, game_type):
        """Test instant game play (AB Fun, Lucky Hit, Soccer Go)"""
        game_configs = {
            'abfun': {'bet_type': 'side', 'bet_value': 'andar'},
            'luckyhit': {'bet_type': 'side', 'bet_value': 'a'},
            'soccergo': {'bet_type': 'winner', 'bet_value': 'a'}
        }
        
        if game_type not in game_configs:
            return False
            
        config = game_configs[game_type]
        return self.run_test(
            f"{game_type.upper()} Play",
            "POST",
            f"games/{game_type}/play",
            200,
            data={
                "bet_type": config['bet_type'],
                "bet_value": config['bet_value'],
                "amount": 10
            }
        )[0]

    def test_payment_packages(self):
        """Test payment packages endpoint"""
        return self.run_test("Payment Packages", "GET", "payments/packages", 200)[0]

    def test_create_checkout(self):
        """Test Stripe checkout creation"""
        return self.run_test(
            "Create Checkout",
            "POST",
            "payments/create-checkout",
            200,
            data={
                "package_id": "100",
                "origin_url": "https://play-admin-nexus.preview.emergentagent.com"
            }
        )[0]

    def test_profile(self):
        """Test profile endpoint"""
        return self.run_test("Profile", "GET", "profile", 200)[0]

    def test_leaderboard(self):
        """Test leaderboard endpoint"""
        return self.run_test("Leaderboard", "GET", "leaderboard", 200)[0]

    def test_admin_dashboard(self):
        """Test admin dashboard"""
        return self.run_test("Admin Dashboard", "GET", "admin/dashboard", 200, use_admin=True)[0]

    def test_admin_users(self):
        """Test admin users list"""
        return self.run_test("Admin Users", "GET", "admin/users", 200, use_admin=True)[0]

    def test_admin_transactions(self):
        """Test admin transactions"""
        return self.run_test("Admin Transactions", "GET", "admin/transactions", 200, use_admin=True)[0]

    def test_admin_game_stats(self):
        """Test admin game stats"""
        return self.run_test("Admin Game Stats", "GET", "admin/game-stats", 200, use_admin=True)[0]

    def test_withdraw_request(self):
        """Test withdrawal request"""
        return self.run_test(
            "Withdraw Request",
            "POST",
            "wallet/withdraw",
            200,
            data={
                "amount": 50,
                "method": "upi",
                "upi_id": "test@upi"
            }
        )[0]

    def run_all_tests(self):
        """Run comprehensive test suite"""
        self.log("Starting Cooe Game API Testing", "START")
        self.log(f"Base URL: {self.base_url}", "INFO")
        
        # Test admin authentication
        self.log("\n=== ADMIN AUTHENTICATION ===", "SECTION")
        if not self.test_admin_login():
            self.log("Admin login failed - stopping admin tests", "ERROR")
        
        # Test user authentication
        self.log("\n=== USER AUTHENTICATION ===", "SECTION")
        if not self.test_user_registration():
            self.log("User registration failed - stopping user tests", "ERROR")
            return
        
        self.test_auth_me()
        
        # Test games
        self.log("\n=== GAMES TESTING ===", "SECTION")
        self.test_games_list()
        self.test_wingo_current()
        self.test_wingo_history()
        self.test_aviator_current()
        self.test_aviator_history()
        
        # Test instant games
        for game in ['abfun', 'luckyhit', 'soccergo']:
            self.test_instant_game_play(game)
        
        # Test wallet
        self.log("\n=== WALLET TESTING ===", "SECTION")
        self.test_wallet_balance()
        self.test_wallet_transactions()
        self.test_withdraw_request()
        
        # Test payments
        self.log("\n=== PAYMENTS TESTING ===", "SECTION")
        self.test_payment_packages()
        self.test_create_checkout()
        
        # Test profile & leaderboard
        self.log("\n=== PROFILE & SOCIAL ===", "SECTION")
        self.test_profile()
        self.test_leaderboard()
        
        # Test admin features (if admin login worked)
        if self.admin_token:
            self.log("\n=== ADMIN FEATURES ===", "SECTION")
            self.test_admin_dashboard()
            self.test_admin_users()
            self.test_admin_transactions()
            self.test_admin_game_stats()
        
        # Test logout
        self.log("\n=== CLEANUP ===", "SECTION")
        self.test_auth_logout()
        
        # Print results
        self.print_results()

    def print_results(self):
        """Print test results summary"""
        self.log("\n" + "="*50, "RESULTS")
        self.log(f"Tests Run: {self.tests_run}", "RESULTS")
        self.log(f"Tests Passed: {self.tests_passed}", "RESULTS")
        self.log(f"Tests Failed: {self.tests_run - self.tests_passed}", "RESULTS")
        self.log(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%", "RESULTS")
        
        if self.failed_tests:
            self.log("\nFailed Tests:", "RESULTS")
            for failure in self.failed_tests:
                self.log(f"  - {failure}", "FAIL")
        
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    tester = CooeGameAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())