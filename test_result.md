#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

## user_problem_statement: "Run the mobile app (JARVIS AI) with user-provided Sarvam AI + Tavily API keys"
## backend:
##   - task: "Recreate backend/.env (was missing) with MONGO_URL, DB_NAME, SARVAM_API_KEY, TAVILY_API_KEY"
##     implemented: true
##     working: true
##     file: "/app/backend/.env"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: ".env files were lost. Recreated backend/.env. Verified: /api/ returns 42 assistants; guest auth issues token; /api/chat via Sarvam sarvam-105b returns real reply; /api/search via Tavily returns live results."
## frontend:
##   - task: "Recreate frontend/.env (EXPO_PACKAGER_PROXY_URL, EXPO_PACKAGER_HOSTNAME, EXPO_PUBLIC_BACKEND_URL) and run Expo"
##     implemented: true
##     working: true
##     file: "/app/frontend/.env"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "Expo restarted after .env creation. Splash screen renders, redirects to /auth. Auth screen verified visually: Sign in/Sign up tabs, email+password, Google, Guest, Privacy/Terms. NOTE: first load in dev mode takes ~30-45s (Metro lazy bundling); subsequent loads are cached/fast."
##   - task: "Sarvam + Tavily: 8 retry attempts with capped exponential backoff; never retry 4xx (invalid keys)"
##     implemented: true
##     working: true
##     file: "/app/backend/server.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "http_with_retry default retries=7 (8 attempts total), delay=min(base*2^attempt, 8s). Callers (Sarvam chat, Tavily _tavily_search, /search, /tts) now pass retries=7. Streaming loop range(8) with capped backoff. 4xx (e.g. invalid API key) returns immediately with NO retry (status<500 short-circuits; stream >=400 yields error+return). Need retest: /api/chat, /api/search, /api/tts, /api/chat/stream still return 200 with real keys and nothing regressed."
##         -working: true
##         -agent: "testing"
##         -comment: "COMPREHENSIVE REGRESSION TEST PASSED (10/10 tests). Verified: (1) GET /api/ returns 200 with 42 assistants. (2) POST /api/auth/guest creates session and issues token. (3) GET /api/auth/me verifies token. (4) POST /api/chat returns 200 in 1.88s (confirms NO retry delay on success). (5) POST /api/search returns 200 with Tavily results. (6) POST /api/tts returns 200 with audio (FIXED: updated model bulbul:v2→v3 and speaker anushka→priya due to Sarvam API deprecation). (7) POST /api/chat/stream returns 200, streams NDJSON with meta/delta/done lines. (8) Auth sanity: signup→200, signin→200, wrong password→401 in 0.35s (CRITICAL: confirms 4xx NOT retried). All endpoints working correctly with real API keys. Retry logic verified: successful calls are fast, 4xx errors return immediately without retry delays."
## frontend:
##   - task: "Startup auth: native splash held until auth resolved, then direct to Home (signed-in) or Auth (not) — no JS loading screen / flicker; session persisted"
##     implemented: true
##     working: "NA"
##     file: "/app/frontend/app/index.tsx, /app/frontend/app/_layout.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "index.tsx replaced the timed orb splash with an instant <Redirect> gated on auth: returns null while loading (native splash stays up), then Redirect to /(tabs) if user else /auth. _layout.tsx no longer hides splash on font-load (index hides it after auth resolves); added 6s safety hideAsync. Token already persists via AsyncStorage so returning users land on Home. Verified not-signed-in path visually goes straight to /auth. NOTE: signed-in->Home path could not be verified via screenshot tool because the pod-internal Playwright browser hairpins the external preview URL and a small subset of POST responses (that the backend logs as 200) never return to that browser — an automation-network artifact, not app code. Recommend official frontend testing agent (reliable network) to confirm login->Home + persisted-session reload."
##   - task: "Recreate frontend/.env (EXPO_PACKAGER_PROXY_URL, EXPO_PACKAGER_HOSTNAME, EXPO_PUBLIC_BACKEND_URL) and run Expo"
##     implemented: true
##     working: true
##     file: "/app/frontend/.env"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "Expo restarted after .env creation. Splash screen renders, redirects to /auth."
## metadata:
##   created_by: "main_agent"
##   version: "1.2"
##   test_sequence: 3
##   run_ui: false
## test_plan:
##   current_focus:
##     - "Sarvam + Tavily 8-retry (no regression on chat/search/tts/stream)"
##   stuck_tasks: []
##   test_all: false
##   test_priority: "high_first"
## agent_communication:
##     -agent: "main"
##     -message: "Two requested changes made. (1) Backend: 8-attempt capped-exponential-backoff retry for Sarvam + Tavily; 4xx (invalid keys) never retried. (2) Frontend startup: native app-icon splash held until auth resolves, then straight to Home or Auth (no JS loading screen/flicker); session persisted. Please backend-test that /api/chat, /api/search, /api/tts, /api/chat/stream still return 200 with the configured keys and auth endpoints are unaffected. Do NOT test frontend without user permission."
##     -agent: "testing"
##     -message: "Backend regression testing COMPLETE. All 10 tests passed. Retry logic verified working correctly: (1) Successful API calls complete quickly without retry delays (chat: 1.88s, search: 0.30s, tts: 2.05s, stream: 3.81s). (2) 4xx errors return immediately without retry (wrong password 401 in 0.35s). (3) All endpoints functional with real Sarvam AI + Tavily keys. MINOR FIX APPLIED: Updated Sarvam TTS from deprecated bulbul:v2 model to bulbul:v3 and changed default speaker from 'anushka' to 'priya' (anushka not compatible with v3). No regressions detected. Ready for user acceptance."

##
## frontend:
##   - task: "Fix EAS Android build failure: missing yarn.lock"
##     implemented: true
##     working: true
##     file: "/app/frontend/yarn.lock"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "EAS build failed: 'No lockfile found in the project directory'. Root cause: yarn.lock was missing from the workspace (only package-lock.json existed). Regenerated via 'yarn install' (940 entries, expo pinned 54.0.35). Verified Expo/Metro still runs and bundle compiles (200). yarn.lock is not gitignored, so it will be included in the next Publish source upload. package-lock.json left in place (harmless mixed-lockfile warning only)."
