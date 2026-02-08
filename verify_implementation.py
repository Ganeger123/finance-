import requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def test_auth_flow():
    print("Testing Auth Flow...")
    # 1. Login
    login_data = {
        "username": "hachllersocials@gmail.com",
        "password": "12122007"
    }
    response = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    assert response.status_code == 200
    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    print("✅ Login successful")

    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]

    # 2. Access protected route
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "hachllersocials@gmail.com"
    print("✅ Protected route accessible")

    # 3. Refresh token
    response = requests.post(f"{BASE_URL}/auth/refresh?refresh_token={refresh_token}")
    assert response.status_code == 200
    new_tokens = response.json()
    assert "access_token" in new_tokens
    print("✅ Token refresh successful")

def test_workspace_flow():
    print("\nTesting Workspace Flow...")
    # Login again to get tokens
    login_data = {"username": "hachllersocials@gmail.com", "password": "12122007"}
    tokens = requests.post(f"{BASE_URL}/auth/login", data=login_data).json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    # 1. Create workspace
    ws_data = {"name": "Test Workspace", "slug": f"test-ws-{int(time.time())}"}
    response = requests.post(f"{BASE_URL}/workspaces/", json=ws_data, headers=headers)
    assert response.status_code == 200
    workspace = response.json()
    print(f"✅ Workspace created: {workspace['name']}")

    # 2. List workspaces
    response = requests.get(f"{BASE_URL}/workspaces/", headers=headers)
    assert response.status_code == 200
    assert any(w["id"] == workspace["id"] for w in response.json())
    print("✅ Workspace listing successful")

    return workspace, headers

def test_form_builder_flow(workspace, headers):
    print("\nTesting Form Builder Flow...")
    # 1. Create Form
    form_data = {
        "workspace_id": workspace["id"],
        "name": "Custom Survey",
        "description": "A test form",
        "fields": [
            {"label": "Project Code", "field_type": "text", "required": True},
            {"label": "Budget", "field_type": "number", "required": True},
            {"label": "Department", "field_type": "select", "options": ["IT", "Sales", "HR"]}
        ]
    }
    response = requests.post(f"{BASE_URL}/expense-forms/", json=form_data, headers=headers)
    assert response.status_code == 200
    form = response.json()
    print(f"✅ Form created: {form['name']}")

    # 2. Submit Entry
    entry_data = {
        "form_id": form["id"],
        "workspace_id": workspace["id"],
        "data": {
            form["fields"][0]["id"]: "PRJ-001",
            form["fields"][1]["id"]: 5000,
            form["fields"][2]["id"]: "IT"
        }
    }
    response = requests.post(f"{BASE_URL}/expense-forms/entries", json=entry_data, headers=headers)
    assert response.status_code == 200
    print("✅ Form entry submitted")

if __name__ == "__main__":
    try:
        test_auth_flow()
        workspace, headers = test_workspace_flow()
        test_form_builder_flow(workspace, headers)
        print("\n🎉 ALL TESTS PASSED!")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\n❌ TEST FAILED: {str(e)}")
