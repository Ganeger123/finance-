import requests
import time

BASE_URL = "http://localhost:8000/api"

def test_register_case():
    data = {
        "email": f"test_case_{int(time.time())}@example.com",
        "password": "password123",
        "full_name": "Test Case",
        "role": "STANDARD" # Uppercase
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=data)
    print(f"Status (Uppercase 'STANDARD'): {response.status_code}")
    if response.status_code == 422:
        print(f"Error detail: {response.json()}")

    data["role"] = "standard" # Lowercase
    response = requests.post(f"{BASE_URL}/auth/register", json=data)
    print(f"Status (Lowercase 'standard'): {response.status_code}")

if __name__ == "__main__":
    test_register_case()
