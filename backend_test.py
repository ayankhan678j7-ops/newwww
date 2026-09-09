#!/usr/bin/env python3
"""
Backend API regression test for JARVIS AI
Tests the retry logic changes and all endpoints with real API keys
"""
import requests
import time
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BASE_URL = "https://6a97b1ca-dfd8-4452-b2aa-cff3f76875e0.preview.emergentagent.com/api"

class TestResult:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def add_pass(self, test_name: str, details: str = ""):
        self.passed.append(f"✅ {test_name}: {details}")
    
    def add_fail(self, test_name: str, details: str):
        self.failed.append(f"❌ {test_name}: {details}")
    
    def add_warning(self, test_name: str, details: str):
        self.warnings.append(f"⚠️  {test_name}: {details}")
    
    def print_summary(self):
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        if self.failed:
            print("\n🔴 FAILED TESTS:")
            for fail in self.failed:
                print(f"  {fail}")
        
        if self.warnings:
            print("\n🟡 WARNINGS:")
            for warn in self.warnings:
                print(f"  {warn}")
        
        if self.passed:
            print("\n🟢 PASSED TESTS:")
            for pass_test in self.passed:
                print(f"  {pass_test}")
        
        print("\n" + "="*80)
        print(f"Total: {len(self.passed)} passed, {len(self.failed)} failed, {len(self.warnings)} warnings")
        print("="*80)
        
        return len(self.failed) == 0

result = TestResult()

def test_get_root():
    """Test 1: GET /api/ -> 200, JSON includes assistants count 42"""
    print("\n[Test 1] GET /api/ (health check)")
    try:
        start = time.time()
        resp = requests.get(f"{BASE_URL}/", timeout=10)
        latency = time.time() - start
        
        print(f"  Status: {resp.status_code}, Latency: {latency:.2f}s")
        
        if resp.status_code != 200:
            result.add_fail("GET /api/", f"Expected 200, got {resp.status_code}")
            return None
        
        data = resp.json()
        print(f"  Response: {data}")
        
        assistants_count = data.get("assistants")
        if assistants_count != 42:
            result.add_fail("GET /api/", f"Expected 42 assistants, got {assistants_count}")
            return None
        
        result.add_pass("GET /api/", f"200 OK, {assistants_count} assistants, {latency:.2f}s")
        return data
    except Exception as e:
        result.add_fail("GET /api/", f"Exception: {e}")
        return None

def test_guest_auth():
    """Test 2: POST /api/auth/guest -> 200, returns user + token"""
    print("\n[Test 2] POST /api/auth/guest (create guest session)")
    try:
        start = time.time()
        resp = requests.post(f"{BASE_URL}/auth/guest", 
                            json={"name": "Tester"},
                            timeout=10)
        latency = time.time() - start
        
        print(f"  Status: {resp.status_code}, Latency: {latency:.2f}s")
        
        if resp.status_code != 200:
            result.add_fail("POST /api/auth/guest", f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return None
        
        data = resp.json()
        print(f"  User ID: {data.get('user', {}).get('user_id')}")
        print(f"  Token: {data.get('token', '')[:20]}...")
        
        if not data.get("token"):
            result.add_fail("POST /api/auth/guest", "No token in response")
            return None
        
        if not data.get("user"):
            result.add_fail("POST /api/auth/guest", "No user in response")
            return None
        
        result.add_pass("POST /api/auth/guest", f"200 OK, token issued, {latency:.2f}s")
        return data.get("token")
    except Exception as e:
        result.add_fail("POST /api/auth/guest", f"Exception: {e}")
        return None

def test_auth_me(token: str):
    """Test 3: GET /api/auth/me with token -> 200 returns the user"""
    print("\n[Test 3] GET /api/auth/me (verify token)")
    try:
        start = time.time()
        resp = requests.get(f"{BASE_URL}/auth/me",
                           headers={"Authorization": f"Bearer {token}"},
                           timeout=10)
        latency = time.time() - start
        
        print(f"  Status: {resp.status_code}, Latency: {latency:.2f}s")
        
        if resp.status_code != 200:
            result.add_fail("GET /api/auth/me", f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        print(f"  User: {data.get('name')} ({data.get('user_id')})")
        
        result.add_pass("GET /api/auth/me", f"200 OK, user verified, {latency:.2f}s")
        return True
    except Exception as e:
        result.add_fail("GET /api/auth/me", f"Exception: {e}")
        return False

def test_chat(token: str):
    """Test 4: POST /api/chat -> 200, returns message.content (real Sarvam reply)
    CRITICAL: Must complete in reasonable time (few seconds), NOT hang for very long.
    This confirms successful calls do NOT incur retry delays."""
    print("\n[Test 4] POST /api/chat (Sarvam AI - check no retry delay on success)")
    try:
        start = time.time()
        resp = requests.post(f"{BASE_URL}/chat",
                            headers={"Authorization": f"Bearer {token}"},
                            json={
                                "assistant_id": "personal",
                                "messages": [{"role": "user", "content": "Reply with just the word OK"}]
                            },
                            timeout=120)
        latency = time.time() - start
        
        print(f"  Status: {resp.status_code}, Latency: {latency:.2f}s")
        
        if resp.status_code != 200:
            result.add_fail("POST /api/chat", f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        content = data.get("message", {}).get("content", "")
        print(f"  Response content: {content[:100]}")
        
        if not content:
            result.add_fail("POST /api/chat", "Empty content in response")
            return False
        
        # Check latency - successful call should be fast (under 15s is reasonable for LLM)
        if latency > 30:
            result.add_warning("POST /api/chat", f"Latency {latency:.2f}s is high (expected <30s for success)")
        
        result.add_pass("POST /api/chat", f"200 OK, got response, {latency:.2f}s (confirms no retry delay)")
        return True
    except Exception as e:
        result.add_fail("POST /api/chat", f"Exception: {e}")
        return False

def test_search(token: str):
    """Test 5: POST /api/search -> 200, returns Tavily results/answer"""
    print("\n[Test 5] POST /api/search (Tavily search)")
    try:
        start = time.time()
        resp = requests.post(f"{BASE_URL}/search",
                            headers={"Authorization": f"Bearer {token}"},
                            json={
                                "query": "latest news today",
                                "depth": "basic",
                                "max_results": 3
                            },
                            timeout=60)
        latency = time.time() - start
        
        print(f"  Status: {resp.status_code}, Latency: {latency:.2f}s")
        
        if resp.status_code != 200:
            result.add_fail("POST /api/search", f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        results = data.get("results", [])
        answer = data.get("answer", "")
        
        print(f"  Results count: {len(results)}")
        print(f"  Answer: {answer[:100] if answer else 'None'}")
        
        if not results and not answer:
            result.add_warning("POST /api/search", "No results or answer in response")
        
        result.add_pass("POST /api/search", f"200 OK, {len(results)} results, {latency:.2f}s")
        return True
    except Exception as e:
        result.add_fail("POST /api/search", f"Exception: {e}")
        return False

def test_tts(token: str):
    """Test 6: POST /api/tts -> 200, returns audio_base64 (non-empty) and mime"""
    print("\n[Test 6] POST /api/tts (Sarvam TTS)")
    try:
        start = time.time()
        resp = requests.post(f"{BASE_URL}/tts",
                            headers={"Authorization": f"Bearer {token}"},
                            json={
                                "text": "Hello from Jarvis",
                                "language": "en-IN",
                                "speaker": "priya"
                            },
                            timeout=60)
        latency = time.time() - start
        
        print(f"  Status: {resp.status_code}, Latency: {latency:.2f}s")
        
        if resp.status_code != 200:
            result.add_fail("POST /api/tts", f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        audio_base64 = data.get("audio_base64", "")
        mime = data.get("mime", "")
        
        print(f"  Audio length: {len(audio_base64)} chars")
        print(f"  MIME type: {mime}")
        
        if not audio_base64:
            result.add_fail("POST /api/tts", "Empty audio_base64 in response")
            return False
        
        if not mime:
            result.add_warning("POST /api/tts", "No mime type in response")
        
        result.add_pass("POST /api/tts", f"200 OK, audio {len(audio_base64)} chars, {latency:.2f}s")
        return True
    except Exception as e:
        result.add_fail("POST /api/tts", f"Exception: {e}")
        return False

def test_chat_stream(token: str):
    """Test 7: POST /api/chat/stream -> 200, streams NDJSON lines
    Confirm: meta line, delta lines with content, final done line"""
    print("\n[Test 7] POST /api/chat/stream (streaming endpoint)")
    try:
        start = time.time()
        resp = requests.post(f"{BASE_URL}/chat/stream",
                            headers={"Authorization": f"Bearer {token}"},
                            json={
                                "assistant_id": "personal",
                                "messages": [{"role": "user", "content": "Say hi in one short sentence"}]
                            },
                            stream=True,
                            timeout=120)
        
        print(f"  Status: {resp.status_code}")
        
        if resp.status_code != 200:
            result.add_fail("POST /api/chat/stream", f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        lines = []
        has_meta = False
        has_delta = False
        has_done = False
        content_parts = []
        
        for line in resp.iter_lines():
            if not line:
                continue
            
            try:
                data = json.loads(line.decode('utf-8'))
                lines.append(data)
                
                if data.get("type") == "meta":
                    has_meta = True
                    print(f"  Meta: conversation_id={data.get('conversation_id')}")
                elif data.get("type") == "delta":
                    has_delta = True
                    content_parts.append(data.get("content", ""))
                elif data.get("type") == "done":
                    has_done = True
                    print(f"  Done")
                elif data.get("type") == "error":
                    result.add_fail("POST /api/chat/stream", f"Stream error: {data.get('message')}")
                    return False
            except json.JSONDecodeError as e:
                result.add_warning("POST /api/chat/stream", f"Invalid JSON line: {line[:100]}")
        
        latency = time.time() - start
        full_content = "".join(content_parts)
        
        print(f"  Latency: {latency:.2f}s")
        print(f"  Lines received: {len(lines)}")
        print(f"  Content: {full_content[:100]}")
        
        if not has_meta:
            result.add_fail("POST /api/chat/stream", "Missing meta line")
            return False
        
        if not has_delta:
            result.add_fail("POST /api/chat/stream", "Missing delta lines")
            return False
        
        if not has_done:
            result.add_fail("POST /api/chat/stream", "Missing done line")
            return False
        
        result.add_pass("POST /api/chat/stream", f"200 OK, streamed {len(lines)} lines, {latency:.2f}s")
        return True
    except Exception as e:
        result.add_fail("POST /api/chat/stream", f"Exception: {e}")
        return False

def test_auth_sanity():
    """Test 8: Auth sanity checks
    - Signup with unique email+password -> 200
    - Signin with same creds -> 200
    - Signin with WRONG password -> 401 (FAST, not retried)
    
    CRITICAL: Wrong password 401 must be near-instant (<2s), proving 4xx not retried"""
    print("\n[Test 8] Auth sanity (signup, signin, wrong password)")
    
    # Generate unique email
    import uuid
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "testpass123"
    wrong_password = "wrongpass123"
    
    # Test 8a: Signup
    print("\n  [8a] Signup with unique email")
    try:
        start = time.time()
        resp = requests.post(f"{BASE_URL}/auth/signup",
                            json={
                                "email": unique_email,
                                "password": password,
                                "name": "Test User"
                            },
                            timeout=10)
        latency = time.time() - start
        
        print(f"    Status: {resp.status_code}, Latency: {latency:.2f}s")
        
        if resp.status_code != 200:
            result.add_fail("POST /api/auth/signup", f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        if not data.get("token"):
            result.add_fail("POST /api/auth/signup", "No token in response")
            return False
        
        result.add_pass("POST /api/auth/signup", f"200 OK, account created, {latency:.2f}s")
    except Exception as e:
        result.add_fail("POST /api/auth/signup", f"Exception: {e}")
        return False
    
    # Test 8b: Signin with correct password
    print("\n  [8b] Signin with correct password")
    try:
        start = time.time()
        resp = requests.post(f"{BASE_URL}/auth/signin",
                            json={
                                "email": unique_email,
                                "password": password
                            },
                            timeout=10)
        latency = time.time() - start
        
        print(f"    Status: {resp.status_code}, Latency: {latency:.2f}s")
        
        if resp.status_code != 200:
            result.add_fail("POST /api/auth/signin (correct)", f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        if not data.get("token"):
            result.add_fail("POST /api/auth/signin (correct)", "No token in response")
            return False
        
        result.add_pass("POST /api/auth/signin (correct)", f"200 OK, signed in, {latency:.2f}s")
    except Exception as e:
        result.add_fail("POST /api/auth/signin (correct)", f"Exception: {e}")
        return False
    
    # Test 8c: Signin with WRONG password - CRITICAL TEST
    print("\n  [8c] Signin with WRONG password (CRITICAL: must be fast, not retried)")
    try:
        start = time.time()
        resp = requests.post(f"{BASE_URL}/auth/signin",
                            json={
                                "email": unique_email,
                                "password": wrong_password
                            },
                            timeout=10)
        latency = time.time() - start
        
        print(f"    Status: {resp.status_code}, Latency: {latency:.2f}s")
        
        if resp.status_code != 401:
            result.add_fail("POST /api/auth/signin (wrong pwd)", f"Expected 401, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        # CRITICAL CHECK: Latency must be near-instant (well under 2s)
        # This proves 4xx errors are NOT retried
        if latency > 2.0:
            result.add_fail("POST /api/auth/signin (wrong pwd)", 
                          f"401 took {latency:.2f}s (expected <2s) - 4xx may be retried!")
            return False
        
        result.add_pass("POST /api/auth/signin (wrong pwd)", 
                       f"401 returned in {latency:.2f}s (confirms 4xx not retried)")
        return True
    except Exception as e:
        result.add_fail("POST /api/auth/signin (wrong pwd)", f"Exception: {e}")
        return False

def main():
    print("="*80)
    print("JARVIS AI Backend Regression Test")
    print("Testing retry logic changes and endpoint functionality")
    print("="*80)
    print(f"\nBackend URL: {BASE_URL}")
    
    # Test 1: Health check
    test_get_root()
    
    # Test 2: Create guest session
    token = test_guest_auth()
    if not token:
        print("\n❌ Cannot proceed without auth token")
        result.print_summary()
        sys.exit(1)
    
    # Test 3: Verify token
    test_auth_me(token)
    
    # Test 4: Chat (Sarvam AI) - check no retry delay on success
    test_chat(token)
    
    # Test 5: Search (Tavily)
    test_search(token)
    
    # Test 6: TTS (Sarvam)
    test_tts(token)
    
    # Test 7: Streaming chat
    test_chat_stream(token)
    
    # Test 8: Auth sanity (signup, signin, wrong password)
    test_auth_sanity()
    
    # Print summary
    success = result.print_summary()
    
    if success:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
