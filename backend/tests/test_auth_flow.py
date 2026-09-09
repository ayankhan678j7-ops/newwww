"""Backend auth flow tests for JARVIS AI."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://mobile-deploy-253.preview.emergentagent.com').rstrip('/')
TS = int(time.time())
TEST_EMAIL = f"test+{TS}@example.com"
TEST_PASSWORD = "TestPass123!"
TEST_NAME = "TEST User"

state = {}


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_root(api):
    r = api.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert "assistants" in r.json()


def test_signup(api):
    r = api.post(f"{BASE_URL}/api/auth/signup", json={"name": TEST_NAME, "email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "user" in data and "token" in data
    assert data["user"]["email"] == TEST_EMAIL
    assert data["user"]["mode"] == "password"
    state["token"] = data["token"]
    state["user_id"] = data["user"]["user_id"]


def test_signup_duplicate_409(api):
    r = api.post(f"{BASE_URL}/api/auth/signup", json={"name": TEST_NAME, "email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 409, r.text


def test_signin_correct(api):
    r = api.post(f"{BASE_URL}/api/auth/signin", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["user_id"] == state["user_id"]
    state["token"] = data["token"]


def test_signin_wrong_password_401(api):
    email = f"wrongpw+{TS}@example.com"
    # create account first
    r = api.post(f"{BASE_URL}/api/auth/signup", json={"name": "WrongPW", "email": email, "password": TEST_PASSWORD})
    assert r.status_code == 200
    r = api.post(f"{BASE_URL}/api/auth/signin", json={"email": email, "password": "WRONGPASSWORD"})
    assert r.status_code == 401, r.text


def test_signin_brute_force_throttle_429(api):
    email = f"brute+{TS}@example.com"
    api.post(f"{BASE_URL}/api/auth/signup", json={"name": "Brute", "email": email, "password": TEST_PASSWORD})
    codes = []
    for _ in range(7):
        r = api.post(f"{BASE_URL}/api/auth/signin", json={"email": email, "password": "wrongwrong"})
        codes.append(r.status_code)
    assert 429 in codes, f"Expected 429 in {codes}"


def test_me_valid(api):
    tok = state["token"]
    r = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200, r.text
    assert r.json()["email"] == TEST_EMAIL


def test_me_no_token_401(api):
    r = requests.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401


def test_me_invalid_token_401(api):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


def test_google_upsert(api):
    email = f"google+{TS}@example.com"
    r1 = api.post(f"{BASE_URL}/api/auth/google", json={"name": "Test G", "email": email})
    assert r1.status_code == 200, r1.text
    uid1 = r1.json()["user"]["user_id"]
    r2 = api.post(f"{BASE_URL}/api/auth/google", json={"name": "Test G", "email": email})
    assert r2.status_code == 200
    uid2 = r2.json()["user"]["user_id"]
    assert uid1 == uid2, "Google auth should upsert-by-email (no duplicates)"


def test_guest(api):
    r = api.post(f"{BASE_URL}/api/auth/guest", json={"name": "Guest"})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["mode"] == "guest"
