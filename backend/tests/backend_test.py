"""JARVIS AI backend tests - iteration 2. Covers auth (guest/google/email+pw + throttle),
chat (Sarvam non-stream + NDJSON stream), memory isolation per assistant, ratings, TTS, delete account."""
import os
import json
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://jarvis-ecosystem-1.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


# --------- Shared fixtures ---------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def guest_auth(session):
    r = session.post(f"{API}/auth/guest", json={"name": "TEST_pytest_guest"})
    assert r.status_code == 200
    data = r.json()
    token = data["token"]
    yield {"token": token, "user": data["user"], "headers": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}}
    try:
        session.delete(f"{API}/auth/account", headers={"Authorization": f"Bearer {token}"})
    except Exception:
        pass


# ============ Root / assistants count ============
class TestRoot:
    def test_root_returns_42(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("assistants") == 42

    def test_assistants_list_has_42(self, session):
        r = session.get(f"{API}/assistants")
        assert r.status_code == 200
        data = r.json()
        assert len(data["assistants"]) == 42
        assert "personal" in data["assistants"]
        assert "coding" in data["assistants"]
        assert "health" in data["assistants"]


# ============ Auth: guest / google / me ============
class TestAuthBasic:
    def test_guest(self, session):
        r = session.post(f"{API}/auth/guest", json={"name": "TEST_guest_basic"})
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["mode"] == "guest"
        session.delete(f"{API}/auth/account", headers={"Authorization": f"Bearer {d['token']}"})

    def test_google_synced(self, session):
        email = f"TEST_google_{uuid.uuid4().hex[:8]}@example.com"
        r = session.post(f"{API}/auth/google", json={"name": "TEST G", "email": email})
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == email
        assert d["user"]["mode"] == "google"
        session.delete(f"{API}/auth/account", headers={"Authorization": f"Bearer {d['token']}"})

    def test_me_401_without_token(self, session):
        assert session.get(f"{API}/auth/me").status_code == 401

    def test_me_ok_with_token(self, session, guest_auth):
        r = session.get(f"{API}/auth/me", headers=guest_auth["headers"])
        assert r.status_code == 200
        assert r.json()["user_id"] == guest_auth["user"]["user_id"]


# ============ Auth: email + password + brute-force throttle ============
class TestAuthEmailPassword:
    def _new_email(self):
        return f"test_ep_{uuid.uuid4().hex[:10]}@example.com"

    def test_signup_new_email(self, session):
        email = self._new_email()
        r = session.post(f"{API}/auth/signup", json={"email": email, "password": "Passw0rd!", "name": "TEST_new"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == email
        assert d["user"]["mode"] == "password"
        assert d["token"]
        session.delete(f"{API}/auth/account", headers={"Authorization": f"Bearer {d['token']}"})

    def test_signup_duplicate_returns_409(self, session):
        email = self._new_email()
        r1 = session.post(f"{API}/auth/signup", json={"email": email, "password": "Passw0rd!", "name": "TEST"})
        assert r1.status_code == 200
        token = r1.json()["token"]
        r2 = session.post(f"{API}/auth/signup", json={"email": email, "password": "Passw0rd!"})
        assert r2.status_code == 409
        session.delete(f"{API}/auth/account", headers={"Authorization": f"Bearer {token}"})

    def test_signin_correct(self, session):
        email = self._new_email()
        pw = "Passw0rd!"
        r1 = session.post(f"{API}/auth/signup", json={"email": email, "password": pw})
        assert r1.status_code == 200
        r2 = session.post(f"{API}/auth/signin", json={"email": email, "password": pw})
        assert r2.status_code == 200
        assert r2.json()["user"]["email"] == email
        assert r2.json()["token"]
        session.delete(f"{API}/auth/account", headers={"Authorization": f"Bearer {r2.json()['token']}"})

    def test_signin_wrong_returns_401(self, session):
        email = self._new_email()
        session.post(f"{API}/auth/signup", json={"email": email, "password": "Passw0rd!"})
        r = session.post(f"{API}/auth/signin", json={"email": email, "password": "WrongPw123"})
        assert r.status_code == 401

    def test_signin_throttle_after_5_failures(self, session):
        email = self._new_email()
        # Create user
        session.post(f"{API}/auth/signup", json={"email": email, "password": "Correct1!"})
        codes = []
        for _ in range(5):
            r = session.post(f"{API}/auth/signin", json={"email": email, "password": "wrongwrong"})
            codes.append(r.status_code)
        # 6th attempt should be throttled (429)
        r6 = session.post(f"{API}/auth/signin", json={"email": email, "password": "wrongwrong"})
        assert r6.status_code == 429, f"expected 429 after 5 fails, got {r6.status_code}. prior={codes}"


# ============ Chat non-stream ============
class TestChat:
    def test_chat_personal(self, session, guest_auth):
        r = session.post(f"{API}/chat", json={
            "assistant_id": "personal",
            "messages": [{"role": "user", "content": "Say hi in one short line."}],
        }, headers=guest_auth["headers"], timeout=120)
        assert r.status_code == 200, r.text[:400]
        d = r.json()
        assert d["conversation_id"]
        assert d["message"]["role"] == "assistant"
        assert len(d["message"]["content"]) > 0

    def test_chat_requires_auth(self, session):
        r = session.post(f"{API}/chat", json={"assistant_id": "personal", "messages": [{"role": "user", "content": "hi"}]})
        assert r.status_code == 401

    def test_chat_different_assistants_differ(self, session, guest_auth):
        """Coding vs Health should produce distinct replies (spot check)."""
        r_code = session.post(f"{API}/chat", json={
            "assistant_id": "coding",
            "messages": [{"role": "user", "content": "Give me a Python one-liner to reverse a string."}],
        }, headers=guest_auth["headers"], timeout=120)
        r_health = session.post(f"{API}/chat", json={
            "assistant_id": "health",
            "messages": [{"role": "user", "content": "Tips for better sleep hygiene?"}],
        }, headers=guest_auth["headers"], timeout=120)
        assert r_code.status_code == 200 and r_health.status_code == 200
        c1 = r_code.json()["message"]["content"]
        c2 = r_health.json()["message"]["content"]
        assert c1 and c2 and c1 != c2


# ============ Chat streaming (NDJSON) ============
class TestChatStream:
    def _consume(self, url, payload, headers):
        events = []
        with requests.post(url, json=payload, headers=headers, stream=True, timeout=120) as r:
            assert r.status_code == 200, f"stream status {r.status_code}: {r.text[:300]}"
            for raw in r.iter_lines(decode_unicode=True):
                if not raw:
                    continue
                try:
                    events.append(json.loads(raw))
                except Exception:
                    pass
        return events

    def test_stream_meta_delta_done(self, guest_auth):
        events = self._consume(f"{API}/chat/stream", {
            "assistant_id": "personal",
            "messages": [{"role": "user", "content": "Give a two-word greeting."}],
        }, guest_auth["headers"])
        types = [e["type"] for e in events]
        assert types, "no events received"
        assert types[0] == "meta", f"first event should be meta, got {types[:3]}"
        assert "done" in types, f"missing done; got {types}"
        deltas = [e for e in events if e["type"] == "delta"]
        assert len(deltas) > 0, "no deltas emitted"
        assert all(isinstance(d.get("content"), str) and d["content"] for d in deltas)

    def test_stream_with_search_citations_first(self, guest_auth):
        events = self._consume(f"{API}/chat/stream", {
            "assistant_id": "search",
            "messages": [{"role": "user", "content": "Latest news about Chandrayaan 2026"}],
            "use_search": True,
        }, guest_auth["headers"])
        types = [e["type"] for e in events]
        if "citations" not in types:
            pytest.skip("Tavily returned no citations (transient)")
        # citations must come before any delta
        idx_c = types.index("citations")
        idx_d = types.index("delta") if "delta" in types else 10**6
        assert idx_c < idx_d, f"citations must precede deltas; got {types[:6]}"
        assert isinstance(events[idx_c]["items"], list)


# ============ Memory isolation per assistant ============
class TestMemoryIsolation:
    def test_scoped_and_global(self, session, guest_auth):
        h = guest_auth["headers"]
        # global memory (no assistant_id)
        g = session.post(f"{API}/memory", json={"category": "general", "content": "TEST_ global_pref"}, headers=h).json()
        # coding-only
        c = session.post(f"{API}/memory", json={"category": "coding", "content": "TEST_ coding_pref", "assistant_id": "coding"}, headers=h).json()
        # writing-only
        w = session.post(f"{API}/memory", json={"category": "writing", "content": "TEST_ writing_pref", "assistant_id": "writing"}, headers=h).json()

        coding_list = session.get(f"{API}/memory?assistant_id=coding", headers=h).json()
        writing_list = session.get(f"{API}/memory?assistant_id=writing", headers=h).json()
        ids_coding = {m["memory_id"] for m in coding_list}
        ids_writing = {m["memory_id"] for m in writing_list}

        assert c["memory_id"] in ids_coding
        assert g["memory_id"] in ids_coding, "global memory should appear in coding scope"
        assert w["memory_id"] not in ids_coding, "writing-only mem should NOT be in coding scope"
        assert w["memory_id"] in ids_writing
        assert g["memory_id"] in ids_writing
        assert c["memory_id"] not in ids_writing

        # cleanup
        for m in (g, c, w):
            session.delete(f"{API}/memory/{m['memory_id']}", headers=h)


# ============ Ratings ============
class TestRatings:
    def test_add_and_list_mine(self, session, guest_auth):
        h = guest_auth["headers"]
        r = session.post(f"{API}/ratings", json={"rating": 5, "comment": "TEST_ great"}, headers=h)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        rid = r.json()["rating_id"]
        assert rid.startswith("rate_")
        mine = session.get(f"{API}/ratings/mine", headers=h).json()
        assert any(x["rating_id"] == rid and x["rating"] == 5 and x["comment"] == "TEST_ great" for x in mine)


# ============ TTS ============
class TestTTS:
    def test_tts_base64(self, session, guest_auth):
        r = session.post(f"{API}/tts", json={"text": "Hello from JARVIS.", "language": "en-IN"},
                         headers=guest_auth["headers"], timeout=60)
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d.get("audio_base64") and len(d["audio_base64"]) > 100
        assert d.get("mime") == "audio/wav"


# ============ Delete account wipes everything ============
class TestDeleteAccount:
    def test_delete_wipes(self, session):
        r = session.post(f"{API}/auth/guest", json={"name": "TEST_del_wipe"})
        token = r.json()["token"]
        h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        # create some data
        session.post(f"{API}/memory", json={"category": "general", "content": "TEST_ wipe_me"}, headers=h)
        session.post(f"{API}/ratings", json={"rating": 4, "comment": "TEST_ wipe"}, headers=h)
        # delete
        d = session.delete(f"{API}/auth/account", headers=h)
        assert d.status_code == 200
        assert session.get(f"{API}/auth/me", headers=h).status_code == 401
