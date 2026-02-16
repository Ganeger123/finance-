import requests
import json

BASE_URL = "http://127.0.0.1:8001/api"
EMAIL = "hachllersocials@gmail.com"
PASSWORD = "12122007"

def test_migration():
    print(f"Testing migration for {EMAIL}...")
    
    # 1. Login
    login_url = f"{BASE_URL}/auth/login"
    response = requests.post(login_url, data={"email": EMAIL, "password": PASSWORD})
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return
    
    token_data = response.json()
    access_token = token_data.get("access_token")
    print(f"✅ Login successful. Token: {access_token[:20]}...")
    
    headers = {"Authorization": f"Bearer {access_token}"}
    
    # 2. Health Check
    health_url = f"{BASE_URL}/health-check"
    health_resp = requests.get(health_url)
    print(f"✅ Health check: {health_resp.json()}")
    
    # 3. Dashboard
    dashboard_url = f"{BASE_URL}/dashboard/"
    dashboard_resp = requests.get(dashboard_url, headers=headers)
    print(f"✅ Dashboard: {dashboard_resp.json()}")
    
    # 4. Transactions
    transactions_url = f"{BASE_URL}/transactions/"
    transactions_resp = requests.get(transactions_url, headers=headers)
    print(f"✅ Transactions count: {len(transactions_resp.json())}")
    
    # 5. Income
    income_url = f"{BASE_URL}/income/"
    income_resp = requests.get(income_url, headers=headers)
    print(f"✅ Income count: {len(income_resp.json())}")
    
    # 6. Expenses
    expenses_url = f"{BASE_URL}/expenses/"
    expenses_resp = requests.get(expenses_url, headers=headers)
    print(f"✅ Expenses count: {len(expenses_resp.json())}")

if __name__ == "__main__":
    test_migration()
