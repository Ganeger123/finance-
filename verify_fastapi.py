import requests

BASE_URL = "http://localhost:8000/api"

def test_health():
    try:
        response = requests.get("http://localhost:8000/")
        print(f"Health check: {response.status_code}, {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")

def test_admin_protected():
    response = requests.get(f"{BASE_URL}/admin/users/")
    print(f"Admin protection test: {response.status_code} (Expected 401/403)")

def test_assistant_unauth():
    response = requests.post(f"{BASE_URL}/assistant/query", json={"query": "test"})
    print(f"Assistant unauth test: {response.status_code} (Expected 401)")

if __name__ == "__main__":
    test_health()
    test_admin_protected()
    test_assistant_unauth()
