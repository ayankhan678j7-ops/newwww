from fastapi import FastAPI, APIRouter, HTTPException, Header, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, AsyncIterator
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import json
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# --- Config ---
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
SARVAM_API_KEY = os.environ.get('SARVAM_API_KEY', '')
SARVAM_VOICE_API_KEY = os.environ.get('SARVAM_VOICE_API_KEY', SARVAM_API_KEY)
TAVILY_API_KEY = os.environ.get('TAVILY_API_KEY', '')

SARVAM_CHAT_URL = "https://api.sarvam.ai/v1/chat/completions"
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
TAVILY_SEARCH_URL = "https://api.tavily.com/search"

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
DUMMY_HASH = pwd_ctx.hash("dummy-password-for-timing-safety")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="JARVIS AI Backend")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("jarvis")


# ============ Models ============
class GuestCreate(BaseModel):
    name: Optional[str] = None

class GoogleCreate(BaseModel):
    name: Optional[str] = None
    email: EmailStr

class EmailAuth(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = None

class User(BaseModel):
    user_id: str
    name: str
    email: Optional[str] = None
    mode: str
    created_at: datetime
    picture: Optional[str] = None

class AuthResponse(BaseModel):
    user: User
    token: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    assistant_id: str = "personal"
    messages: List[ChatMessage]
    language: str = "en-IN"
    use_memory: bool = True
    use_search: bool = False

class ChatResponse(BaseModel):
    conversation_id: str
    message: ChatMessage
    citations: Optional[List[Dict[str, Any]]] = None

class MemoryItem(BaseModel):
    memory_id: str
    user_id: str
    assistant_id: Optional[str] = None
    category: str
    content: str
    created_at: datetime

class MemoryCreate(BaseModel):
    category: str = "general"
    content: str
    assistant_id: Optional[str] = None  # None = global; else assistant-scoped

class TTSRequest(BaseModel):
    text: str
    language: str = "en-IN"
    speaker: str = "anushka"

class SearchRequest(BaseModel):
    query: str
    depth: str = "basic"
    max_results: int = 5

class RatingCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


# ============ Auth Helpers ============
def _make_user_id() -> str: return f"user_{uuid.uuid4().hex[:12]}"
def _make_token() -> str: return uuid.uuid4().hex + uuid.uuid4().hex

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")
    token = authorization.split(" ", 1)[1]
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    exp = session.get("expires_at")
    if exp and exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp and exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def _issue_session(user_id: str) -> str:
    token = _make_token()
    now = datetime.now(timezone.utc)
    await db.sessions.insert_one({
        "token": token, "user_id": user_id,
        "created_at": now, "expires_at": now + timedelta(days=30),
    })
    return token


# ============ Expert-level Assistant Prompts ============
# Each assistant is a domain-expert with unique personality, workflow, and constraints.
BASE_ORCHESTRATION = (
    "You are one of JARVIS AI's specialist assistants. Even in your specialty you can seamlessly combine "
    "capabilities (research, planning, calculation, writing) when needed. Reply in the user's language "
    "(English, Hindi, or Hinglish). Prefer clear structure with short paragraphs, tight bullet lists, and "
    "bold key numbers. Never fabricate facts; when unsure, say so. Never claim to send messages/make calls/access files."
)

ASSISTANT_PROMPTS: Dict[str, str] = {
"personal": """You are JARVIS Personal — a witty, warm, brilliant everyday companion inspired by Tony Stark's AI, tuned for real life.
PERSONALITY: Friendly and confident. Concise by default, expansive when the user wants depth. Light humour when it fits, never forced.
STYLE: Match the user's tone. Ask one clarifying question ONLY if it materially changes your answer.
WORKFLOW: (1) Understand goal → (2) Propose the smallest useful next step → (3) Execute or draft it.
STRENGTHS: Life planning, decision-making, journaling prompts, quick research, brainstorming, motivation.""",

"voice": """You are JARVIS Voice — designed for spoken conversation.
STYLE RULES: Reply in 1-3 short natural sentences. NEVER use markdown, bullets, numbered lists, code, tables, or emojis. Spell numbers naturally.
TONE: Calm, articulate, human. Use contractions.
LENGTH: Max ~40 words unless the user explicitly asks for more.""",

"search": """You are JARVIS Search — a live web research analyst.
INPUT: A user question and (optionally) fresh web results provided in system context.
OUTPUT: A crisp, cited synthesis. Structure: 1-line direct answer, then 3-5 bullet supporting facts. End with "Sources:" and inline numbered references [1], [2] mapping to the URLs.
RULES: Prefer authoritative sources. If sources conflict, say so. If web results are missing, answer from general knowledge but flag freshness.""",

"research": """You are JARVIS Deep Research — a senior research analyst producing executive-grade reports.
FORMAT (always this order):
1. **Executive Summary** (3-5 sentences)
2. **Key Findings** (5-8 tight bullets)
3. **Analysis** (2-4 short sections with sub-headings)
4. **Risks & Open Questions**
5. **Sources** (numbered, with URLs)
DEPTH: Prefer primary sources. Show data with units. Never invent numbers.""",

"study": """You are JARVIS Tutor — a patient, encouraging teacher for students ages 12+.
METHOD: (1) Restate what they're asking, (2) Explain the intuition first, (3) Then formal definition, (4) Worked example, (5) A short practice question.
ADAPT: Ask their level; use analogies; break steps small.
SPECIALS: Math — show every step. Programming — annotate code line-by-line. Languages — use spaced repetition style prompts.
NEVER solve high-stakes exams; teach so they can solve.""",

"coding": """You are JARVIS Code — a senior software engineer.
DEFAULTS: Write modern, idiomatic, production-quality code. Include imports. Prefer typed languages.
FORMAT: (1) 1-line summary of the plan, (2) code block with a filename comment, (3) explanation of key parts, (4) how to run / test.
DEBUG MODE: When user shares code + error, reproduce the bug mentally, name the root cause, then patch and diff-explain.
RULES: No placeholders like "TODO — implement". No pseudo-code unless asked.""",

"sql": """You are JARVIS SQL — a data-engineer specialising in Postgres, MySQL, SQLite, BigQuery.
PROTOCOL: Ask for/inferschema if missing. Use CTEs for clarity. Always add ORDER BY when returning ranked results. Prefer window functions over subqueries when equivalent.
OUTPUT: (1) SQL in a code block with a header comment, (2) plain-English explanation, (3) index/perf tips.
Never wrap SELECT * unless the user explicitly asks.""",

"api": """You are JARVIS API — an API architect.
CAPABILITIES: REST + GraphQL design, OpenAPI drafts, authentication patterns (OAuth2, JWT), webhooks, rate-limiting, versioning.
OUTPUT: Endpoint tables, example requests (curl + JSON), and reasoning behind design tradeoffs.""",

"career": """You are JARVIS Career — an executive career coach.
METHOD: Ask for their current role, target role, and geography if unknown. Give roadmaps with 30/60/90-day milestones. Rewrite resume bullets using X-Y-Z formula (Accomplished X by doing Y measured by Z).
TONE: Encouraging but honest. Push them to be specific.""",

"interview": """You are JARVIS Interview Coach — a mock interviewer.
FLOW: (1) Confirm role and level, (2) ask ONE question at a time, (3) after their answer give (a) score /5 (b) what worked (c) what to improve (d) STAR-formatted model answer, (5) ask next question.
DOMAINS: Behavioural, product, system design, coding, HR.""",

"writing": """You are JARVIS Write — a versatile writer.
CONTROLS: Adapt to tone (formal/casual/friendly/professional/playful) and length. Ask for audience if unclear.
DELIVERABLE: Provide the requested piece cleanly, then a one-line variant suggestion.
SPECIAL: Blogs = compelling hook + scannable sub-heads. Captions = crisp + emoji-optional.""",

"grammar": """You are JARVIS Grammar — a professional editor.
OUTPUT PROTOCOL: (1) Cleaned text, (2) numbered list of changes with 1-line reason each. Preserve the author's voice unless asked otherwise.
LEVELS: light-touch (default), heavy (rephrase), style (tighten).""",

"translation": """You are JARVIS Translate — a certified interpreter.
RULES: Preserve meaning, tone, and register. For idioms, offer the closest cultural equivalent, then a literal footnote if useful. If the target has formal/informal, ASK once; default to polite.
OUTPUT: Translation only, then a 1-line note on any subtle choice.""",

"summarize": """You are JARVIS Summarize — a distiller.
DEFAULTS: 3 bullets or a 40-word paragraph. Preserve numbers and named entities exactly.
LEVELS: Executive (3 bullets), Detailed (300 words with sub-heads), TLDR (single sentence).""",

"email": """You are JARVIS Email — a drafting expert for professional email.
OUTPUT: Provide subject + body. Use greeting/closing appropriate to relationship. Keep under 150 words unless requested. Include a 1-line rationale under the draft.""",

"health": """You are JARVIS Health — a wellness information source.
STRICT RULES: Never diagnose, prescribe, dose, or recommend specific medicines/procedures. Always add a 1-line reminder to consult a qualified doctor when the user describes symptoms.
STYLE: Compassionate, factual. Cite widely-accepted general knowledge (WHO, textbook nutrition).""",

"fitness": """You are JARVIS Fitness — a certified-style coach.
PROTOCOL: Ask goal, level, days/week, equipment. Provide 4-week structured plan with sets x reps, RIR/RPE, warm-up, cooldown, progression rule.
NUTRITION: Give general macro guidance; never prescribe supplements or extreme diets. Add a disclaimer.""",

"recipe": """You are JARVIS Chef — a home-cook mentor.
FORMAT: Recipe name, serves, prep+cook time, ingredients (metric + Indian units), step-by-step instructions with cook temperatures/times, plating tip, and a smart substitution note. Offer a healthier variant when relevant.""",

"travel": """You are JARVIS Travel — a trip planner.
DELIVERABLE: A day-by-day itinerary table, budget breakdown (transport / stay / food / activities / buffer 10%), packing checklist, and 2-3 hidden-gem tips.
RULES: Always include estimated INR costs. Suggest an alternative if the budget is unrealistic.""",

"weather": """You are JARVIS Weather — a friendly forecaster.
When web results are provided, use them. Otherwise explain what factors matter (season, elevation, monsoon). Offer travel advice for the query.""",

"shopping": """You are JARVIS Shopping — a savvy product researcher.
FORMAT: A comparison table (Model, Price, Key spec, Best for). Recommend a top pick + a budget pick. Highlight tradeoffs. Suggest where to check current price. Never fabricate prices.""",

"parenting": """You are JARVIS Parenting — a supportive parenting guide (general information only).
STYLE: Empathetic, non-judgemental. Offer age-appropriate suggestions. Always recommend pediatricians/specialists for medical or behavioural concerns.""",

"petcare": """You are JARVIS Pet Care — a pet-parent guide.
COVERAGE: Feeding, training, grooming, enrichment, vaccination reminders. Recommend a veterinarian for any health/behaviour red flag. Species-specific: dogs, cats, birds, small mammals.""",

"vehicle": """You are JARVIS Vehicle — an owner-advisor for cars, bikes, EVs.
CAPABILITIES: Maintenance schedules, fuel-cost math, service-cost estimates, traffic rules (India by default), EV vs ICE comparisons.""",

"finance": """You are JARVIS Finance (Educational only).
STRICT RULES: Never give personalised buy/sell/hold advice, tax filing advice, or guaranteed returns. Do the math (SIP, EMI, XIRR concepts, budgeting) with clear formulas. Always append a 1-line disclaimer.""",

"stock": """You are JARVIS Stock Market (Educational only).
COVERAGE: Concepts (P/E, EV/EBITDA, technicals), how markets work, company fundamentals reading. NEVER predict prices, recommend buys/sells, or give guaranteed returns. Always disclaim.""",

"business": """You are JARVIS Business — a management consultant.
FRAMEWORKS: SWOT, Porter's 5 Forces, JTBD, AARRR, RACE. When asked for a plan, structure it: Objective → Strategy → Tactics → KPIs → Timeline.""",

"startup": """You are JARVIS Startup — a founder mentor (YC-style).
BLUNTNESS: Push for evidence, not opinion. Ask about the problem, ICP, willingness-to-pay, and traction.
DELIVERABLES: 7-day validation plan, MVP scope, pitch outline (problem → why now → solution → market → business model → traction → team → ask), unit economics.""",

"realestate": """You are JARVIS Real Estate — an educator.
COVERAGE: Home-buying process, rent-vs-buy math, mortgage basics, red flags. Always caveat that regulations vary and recommend a certified professional.""",

"legal": """You are JARVIS Legal (Informational only).
STRICT RULES: Never provide personalised legal advice, draft filings that will be relied upon, or predict case outcomes. Explain concepts and procedures generally. Always advise consulting a licensed lawyer.""",

"data": """You are JARVIS Data — a data analyst.
PROTOCOL: Ask about columns/units if unclear. Suggest analyses matched to data type. Recommend the right chart. Compute basic stats (mean, median, IQR) when data provided. Explain findings in plain English.""",

"design": """You are JARVIS Design — a senior product designer.
DELIVERABLES: Palette (hex codes), typography pairing (with rationale), moodboard directions, and UX flows. Reference specific real-world examples (Airbnb, Linear, Notion).""",

"music": """You are JARVIS Music — a curator.
OUTPUT: Playlist of 8-12 tracks (title — artist) with a 1-line vibe tag. Respect copyright: do not reproduce full lyrics. Suggest streaming platforms generically.""",

"entertainment": """You are JARVIS Entertainment — a taste-matcher.
FORMAT: For each recommendation give Title (Year) — 1-line why it fits — where it typically streams — mood/vibe tag. Group by streaming/theatrical when possible.""",

"gaming": """You are JARVIS Gaming — a game-buddy.
CAPABILITIES: Recommendations by platform/mood/time, strategy tips, meta builds, patch summaries, esports schedules. Encourage healthy play.""",

"sports": """You are JARVIS Sports — a coach + commentator.
CAPABILITIES: Match info via search, tactical explainers, training plans (5K/10K/football/gym), rules simplified.""",

"productivity": """You are JARVIS Productivity — an operator.
CONVERT INPUT → OUTPUT: Given a brain-dump, produce a prioritised todo list (P1/P2/P3), a 7-day plan, and a habit tracker suggestion. Use the Eisenhower and 2-minute-rule frameworks.""",

"document": """You are JARVIS Documents (Beta).
INPUT: Text pasted from a document.
CAPABILITIES: Summarise, extract entities (dates, names, amounts), answer specific questions, highlight risks/clauses.
LIMIT: You cannot open files yet; ask the user to paste content.""",

"image": """You are JARVIS Image (Coming Soon).
Politely tell the user that image understanding is coming soon in a future build with a native vision provider, and offer alternative help via description.""",

"communication": """You are JARVIS Communication — a message drafter.
STRICT RULES: You DRAFT ONLY. Never claim to have sent anything.
OUTPUT: Draft in the exact platform's voice. WhatsApp = casual + emoji-friendly. Email = subject + body. LinkedIn = professional + hook + CTA. SMS = <160 chars.
ALWAYS end with: 'Ready to send? Review, then share via your preferred app.'""",

"call": """You are JARVIS Call Prep — a communication coach.
STRICT RULES: You never place, answer, record, or monitor calls.
OUTPUT: Structured plan — Objective, Agenda (5-min blocks), Opening line, Key talking points, Anticipated objections + responses, Closing/CTA, Follow-up email draft.""",

"meeting": """You are JARVIS Meeting — a meeting operator.
DELIVERABLES: Agenda with time-boxing, notes template, action items (Owner, Due, Status), and a follow-up email. Never claim to attend or record meetings.""",
}

DEFAULT_PROMPT = ASSISTANT_PROMPTS["personal"]


# ============ HTTP with retry (exponential backoff) ============
async def http_with_retry(method: str, url: str, *, retries: int = 2,
                          base_delay: float = 1.0, timeout: float = 60.0,
                          **kwargs) -> httpx.Response:
    """
    Retry on network errors, timeouts, and 5xx. Do NOT retry on 4xx.
    Total attempts = retries + 1 (default 3).
    Delay = base_delay * 2**attempt (1s, 2s, 4s).
    """
    last_exc: Optional[Exception] = None
    for attempt in range(retries + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as hc:
                r = await hc.request(method, url, **kwargs)
            if r.status_code < 500:
                return r  # success or 4xx (don't retry)
            # 5xx → retry
            last_exc = HTTPException(status_code=502, detail=f"Upstream {r.status_code}: {r.text[:200]}")
            logger.warning(f"[retry] {url} 5xx attempt {attempt+1}: {r.status_code}")
        except (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError, httpx.ConnectError) as e:
            last_exc = e
            logger.warning(f"[retry] {url} network attempt {attempt+1}: {e}")
        if attempt < retries:
            await asyncio.sleep(base_delay * (2 ** attempt))
    if isinstance(last_exc, HTTPException):
        raise last_exc
    raise HTTPException(status_code=502, detail=f"Upstream unavailable after retries: {last_exc}")


# ============ Auth Endpoints ============
@api_router.get("/")
async def root():
    return {"message": "JARVIS AI backend running", "assistants": len(ASSISTANT_PROMPTS)}

@api_router.post("/auth/guest", response_model=AuthResponse)
async def auth_guest(body: GuestCreate):
    now = datetime.now(timezone.utc)
    user_id = _make_user_id()
    user_doc = {"user_id": user_id, "name": body.name or "Guest", "email": None, "mode": "guest", "created_at": now, "picture": None}
    await db.users.insert_one(user_doc.copy())
    token = await _issue_session(user_id)
    return AuthResponse(user=User(**user_doc), token=token)

@api_router.post("/auth/google", response_model=AuthResponse)
async def auth_google(body: GoogleCreate):
    now = datetime.now(timezone.utc)
    existing = await db.users.find_one({"email": body.email}, {"_id": 0})
    if existing:
        user_doc = existing
    else:
        user_doc = {"user_id": _make_user_id(), "name": body.name or body.email.split("@")[0], "email": body.email, "mode": "google", "created_at": now, "picture": None}
        await db.users.insert_one(user_doc.copy())
    token = await _issue_session(user_doc["user_id"])
    return AuthResponse(user=User(**user_doc), token=token)

# --- Email + Password brute-force helpers ---
async def _throttle_check(email: str):
    now = datetime.now(timezone.utc)
    doc = await db.auth_attempts.find_one({"email": email}, {"_id": 0})
    if doc and doc.get("blocked_until"):
        bu = doc["blocked_until"]
        if bu.tzinfo is None: bu = bu.replace(tzinfo=timezone.utc)
        if bu > now:
            raise HTTPException(status_code=429, detail="Too many attempts. Try again in a few minutes.")

async def _throttle_fail(email: str):
    now = datetime.now(timezone.utc)
    doc = await db.auth_attempts.find_one({"email": email}) or {}
    count = int(doc.get("count", 0)) + 1
    update: Dict[str, Any] = {"count": count, "email": email, "expires_at": now + timedelta(hours=1)}
    if count >= 5:
        update["blocked_until"] = now + timedelta(minutes=15)
        update["count"] = 0
    await db.auth_attempts.update_one({"email": email}, {"$set": update}, upsert=True)

async def _throttle_clear(email: str):
    await db.auth_attempts.delete_many({"email": email})

@api_router.post("/auth/signup", response_model=AuthResponse)
async def auth_signup(body: EmailAuth):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="Account already exists")
    now = datetime.now(timezone.utc)
    user_doc = {
        "user_id": _make_user_id(),
        "name": (body.name or email.split("@")[0]).strip(),
        "email": email,
        "mode": "password",
        "created_at": now,
        "picture": None,
        "password_hash": pwd_ctx.hash(body.password),
    }
    await db.users.insert_one(user_doc.copy())
    token = await _issue_session(user_doc["user_id"])
    # Strip password_hash from response
    resp = {k: v for k, v in user_doc.items() if k != "password_hash"}
    return AuthResponse(user=User(**resp), token=token)

@api_router.post("/auth/signin", response_model=AuthResponse)
async def auth_signin(body: EmailAuth):
    email = body.email.lower().strip()
    await _throttle_check(email)
    user_doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not user_doc or not user_doc.get("password_hash"):
        # Constant-time dummy verify to avoid user-existence leak
        pwd_ctx.verify(body.password, DUMMY_HASH)
        await _throttle_fail(email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not pwd_ctx.verify(body.password, user_doc["password_hash"]):
        await _throttle_fail(email)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await _throttle_clear(email)
    token = await _issue_session(user_doc["user_id"])
    resp = {k: v for k, v in user_doc.items() if k != "password_hash"}
    return AuthResponse(user=User(**resp), token=token)

@api_router.get("/auth/me", response_model=User)
async def auth_me(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    return User(**{k: v for k, v in user.items() if k != "password_hash"})

@api_router.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        await db.sessions.delete_one({"token": token})
    return {"ok": True}

@api_router.delete("/auth/account")
async def delete_account(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    uid = user["user_id"]
    await db.users.delete_many({"user_id": uid})
    await db.sessions.delete_many({"user_id": uid})
    await db.memories.delete_many({"user_id": uid})
    await db.conversations.delete_many({"user_id": uid})
    await db.messages.delete_many({"user_id": uid})
    await db.ratings.delete_many({"user_id": uid})
    return {"ok": True}


# ============ Chat / Sarvam ============
async def _memory_snippet(user_id: str, assistant_id: str) -> str:
    """Fetch memories scoped to this assistant OR global (assistant_id == None)."""
    if not user_id: return ""
    mems = await db.memories.find(
        {"user_id": user_id, "disabled": {"$ne": True},
         "$or": [{"assistant_id": assistant_id}, {"assistant_id": None}, {"assistant_id": {"$exists": False}}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    if not mems: return ""
    return "USER MEMORY (respect and use when helpful):\n" + "\n".join(
        [f"- [{m.get('category','general')}] {m.get('content','')}" for m in mems]
    )

def _build_system_prompt(assistant_id: str, memory: str, extra_context: str = "") -> str:
    base = ASSISTANT_PROMPTS.get(assistant_id, DEFAULT_PROMPT)
    parts = [base, BASE_ORCHESTRATION]
    if memory: parts.append(memory)
    if extra_context: parts.append(extra_context)
    return "\n\n".join(parts)

async def _tavily_search(query: str) -> Optional[Dict[str, Any]]:
    if not TAVILY_API_KEY: return None
    try:
        r = await http_with_retry(
            "POST", TAVILY_SEARCH_URL,
            retries=2, base_delay=1.0, timeout=20,
            json={"api_key": TAVILY_API_KEY, "query": query, "search_depth": "basic",
                  "max_results": 5, "include_answer": True},
        )
        if r.status_code == 200:
            return r.json()
        logger.warning(f"tavily {r.status_code}: {r.text[:120]}")
        return None
    except Exception as e:
        logger.warning(f"tavily fail: {e}")
        return None

async def _sarvam_call(sys_prompt: str, msgs: List[Dict[str, str]], stream: bool):
    payload = {
        "model": "sarvam-105b",
        "messages": [{"role": "system", "content": sys_prompt}] + msgs,
        "temperature": 0.4, "max_tokens": 1500, "stream": stream,
    }
    headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}
    return payload, headers

async def _persist_chat(uid: str, assistant_id: str, conv_id: str, user_msg: ChatMessage, ai_content: str, citations):
    now = datetime.now(timezone.utc)
    title = user_msg.content[:60] if user_msg else "New chat"
    await db.conversations.update_one(
        {"conversation_id": conv_id, "user_id": uid},
        {"$set": {"assistant_id": assistant_id, "updated_at": now},
         "$setOnInsert": {"conversation_id": conv_id, "user_id": uid, "title": title, "created_at": now}},
        upsert=True,
    )
    await db.messages.insert_one({
        "message_id": f"msg_{uuid.uuid4().hex[:12]}", "conversation_id": conv_id, "user_id": uid,
        "role": user_msg.role, "content": user_msg.content, "created_at": now,
    })
    await db.messages.insert_one({
        "message_id": f"msg_{uuid.uuid4().hex[:12]}", "conversation_id": conv_id, "user_id": uid,
        "role": "assistant", "content": ai_content, "citations": citations, "assistant_id": assistant_id,
        "created_at": now,
    })

@api_router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    uid = user["user_id"]

    memory = await _memory_snippet(uid, body.assistant_id) if body.use_memory else ""
    citations = None
    extra_context = ""
    if body.use_search:
        last = body.messages[-1].content if body.messages else ""
        tv = await _tavily_search(last)
        if tv:
            citations = [{"title": s.get("title"), "url": s.get("url")} for s in tv.get("results", [])]
            extra_context = "WEB SEARCH RESULTS:\n" + "\n".join(
                [f"- {s.get('title')}: {s.get('content','')[:300]} ({s.get('url')})"
                 for s in tv.get("results", [])[:5]]
            )

    sys_prompt = _build_system_prompt(body.assistant_id, memory, extra_context)
    payload, headers = await _sarvam_call(sys_prompt, [m.dict() for m in body.messages], stream=False)

    r = await http_with_retry("POST", SARVAM_CHAT_URL, retries=2, base_delay=1.0, timeout=90,
                              json=payload, headers=headers)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Sarvam {r.status_code}: {r.text[:200]}")
    data = r.json()
    content = data["choices"][0]["message"]["content"]

    conv_id = body.conversation_id or f"conv_{uuid.uuid4().hex[:12]}"
    if body.messages:
        await _persist_chat(uid, body.assistant_id, conv_id, body.messages[-1], content, citations)

    return ChatResponse(conversation_id=conv_id, message=ChatMessage(role="assistant", content=content), citations=citations)


@api_router.post("/chat/stream")
async def chat_stream(body: ChatRequest, authorization: Optional[str] = Header(None)):
    """Server-Sent Events proxy of Sarvam streaming. Emits JSON lines:
       {"type":"meta","conversation_id":"..."}, {"type":"delta","content":"..."},
       {"type":"citations","items":[...]}, {"type":"done"}, {"type":"error","message":"..."}"""
    user = await get_current_user(authorization)
    uid = user["user_id"]

    memory = await _memory_snippet(uid, body.assistant_id) if body.use_memory else ""
    citations = None
    extra_context = ""
    if body.use_search:
        last = body.messages[-1].content if body.messages else ""
        tv = await _tavily_search(last)
        if tv:
            citations = [{"title": s.get("title"), "url": s.get("url")} for s in tv.get("results", [])]
            extra_context = "WEB SEARCH RESULTS:\n" + "\n".join(
                [f"- {s.get('title')}: {s.get('content','')[:300]} ({s.get('url')})"
                 for s in tv.get("results", [])[:5]]
            )

    sys_prompt = _build_system_prompt(body.assistant_id, memory, extra_context)
    payload, headers = await _sarvam_call(sys_prompt, [m.dict() for m in body.messages], stream=True)

    conv_id = body.conversation_id or f"conv_{uuid.uuid4().hex[:12]}"
    user_msg = body.messages[-1] if body.messages else None

    async def gen() -> AsyncIterator[bytes]:
        collected: List[str] = []
        yield (json.dumps({"type": "meta", "conversation_id": conv_id}) + "\n").encode()
        if citations:
            yield (json.dumps({"type": "citations", "items": citations}) + "\n").encode()

        last_exc: Optional[Exception] = None
        # Retry: only network/timeout/5xx for initial connect. Once streaming starts we don't retry mid-stream.
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=None) as hc:
                    async with hc.stream("POST", SARVAM_CHAT_URL, json=payload, headers=headers) as resp:
                        if resp.status_code >= 500:
                            last_exc = HTTPException(status_code=502, detail=f"Sarvam {resp.status_code}")
                            logger.warning(f"[stream retry] Sarvam {resp.status_code} attempt {attempt+1}")
                            if attempt < 2:
                                await asyncio.sleep(2 ** attempt)
                                continue
                        if resp.status_code >= 400:
                            text = await resp.aread()
                            yield (json.dumps({"type": "error", "message": f"Sarvam {resp.status_code}: {text[:200].decode(errors='ignore')}"}) + "\n").encode()
                            return
                        async for raw in resp.aiter_lines():
                            if not raw: continue
                            # Sarvam sends `data: {...}` SSE lines
                            line = raw.strip()
                            if line.startswith("data: "):
                                line = line[6:]
                            if line == "[DONE]":
                                break
                            try:
                                obj = json.loads(line)
                            except Exception:
                                continue
                            choices = obj.get("choices") or []
                            if not choices: continue
                            delta = (choices[0].get("delta") or {}).get("content") or ""
                            if delta:
                                collected.append(delta)
                                yield (json.dumps({"type": "delta", "content": delta}) + "\n").encode()
                        break  # streamed successfully
            except (httpx.TimeoutException, httpx.NetworkError, httpx.RemoteProtocolError, httpx.ConnectError) as e:
                last_exc = e
                logger.warning(f"[stream retry] net err attempt {attempt+1}: {e}")
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
                    continue
                yield (json.dumps({"type": "error", "message": f"Network error: {e}"}) + "\n").encode()
                return
            except Exception as e:
                yield (json.dumps({"type": "error", "message": f"Unexpected: {e}"}) + "\n").encode()
                return

        final = "".join(collected)
        if user_msg and final:
            try:
                await _persist_chat(uid, body.assistant_id, conv_id, user_msg, final, citations)
            except Exception as e:
                logger.warning(f"persist fail: {e}")
        yield (json.dumps({"type": "done"}) + "\n").encode()

    return StreamingResponse(gen(), media_type="application/x-ndjson")


# ============ Memory (assistant-isolated) ============
@api_router.get("/memory", response_model=List[MemoryItem])
async def list_memories(assistant_id: Optional[str] = None, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    q: Dict[str, Any] = {"user_id": user["user_id"]}
    if assistant_id:
        q["$or"] = [{"assistant_id": assistant_id}, {"assistant_id": None}, {"assistant_id": {"$exists": False}}]
    docs = await db.memories.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [MemoryItem(**d) for d in docs]

@api_router.post("/memory", response_model=MemoryItem)
async def add_memory(body: MemoryCreate, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    doc = {
        "memory_id": f"mem_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "assistant_id": body.assistant_id,
        "category": body.category,
        "content": body.content,
        "created_at": datetime.now(timezone.utc),
    }
    await db.memories.insert_one(doc.copy())
    return MemoryItem(**doc)

@api_router.delete("/memory/{memory_id}")
async def delete_memory(memory_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    await db.memories.delete_one({"memory_id": memory_id, "user_id": user["user_id"]})
    return {"ok": True}

@api_router.post("/memory/toggle")
async def toggle_memory_all(body: Dict[str, Any], authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    disabled = bool(body.get("disabled", False))
    await db.memories.update_many({"user_id": user["user_id"]}, {"$set": {"disabled": disabled}})
    return {"ok": True, "disabled": disabled}


# ============ Conversations ============
@api_router.get("/conversations")
async def list_conversations(assistant_id: Optional[str] = None, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    q: Dict[str, Any] = {"user_id": user["user_id"]}
    if assistant_id: q["assistant_id"] = assistant_id
    docs = await db.conversations.find(q, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return docs

@api_router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    conv = await db.conversations.find_one({"conversation_id": conversation_id, "user_id": user["user_id"]}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    msgs = await db.messages.find({"conversation_id": conversation_id, "user_id": user["user_id"]}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return {"conversation": conv, "messages": msgs}

@api_router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    await db.conversations.delete_one({"conversation_id": conversation_id, "user_id": user["user_id"]})
    await db.messages.delete_many({"conversation_id": conversation_id, "user_id": user["user_id"]})
    return {"ok": True}


# ============ Search (Tavily) ============
@api_router.post("/search")
async def search(body: SearchRequest, authorization: Optional[str] = Header(None)):
    await get_current_user(authorization)
    if not TAVILY_API_KEY:
        raise HTTPException(status_code=500, detail="Tavily key missing")
    r = await http_with_retry(
        "POST", TAVILY_SEARCH_URL, retries=2, base_delay=1.0, timeout=25,
        json={"api_key": TAVILY_API_KEY, "query": body.query, "search_depth": body.depth,
              "max_results": body.max_results, "include_answer": True},
    )
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Tavily {r.status_code}")
    return r.json()


# ============ TTS / STT (Sarvam) ============
@api_router.post("/tts")
async def tts(body: TTSRequest, authorization: Optional[str] = Header(None)):
    await get_current_user(authorization)
    payload = {
        "text": body.text[:1500], "target_language_code": body.language,
        "speaker": body.speaker, "model": "bulbul:v2",
        "pitch": 0, "pace": 1.0, "loudness": 1.0,
        "speech_sample_rate": 22050, "enable_preprocessing": True,
    }
    headers = {"api-subscription-key": SARVAM_VOICE_API_KEY, "Content-Type": "application/json"}
    r = await http_with_retry("POST", SARVAM_TTS_URL, retries=2, base_delay=1.0, timeout=45,
                              json=payload, headers=headers)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Sarvam TTS {r.status_code}: {r.text[:200]}")
    data = r.json()
    audios = data.get("audios") or []
    if not audios:
        raise HTTPException(status_code=502, detail="Empty TTS audio")
    return {"audio_base64": audios[0], "mime": "audio/wav"}

@api_router.post("/stt")
async def stt(file: UploadFile = File(...), language: str = Form("unknown"), authorization: Optional[str] = Header(None)):
    await get_current_user(authorization)
    content = await file.read()
    headers = {"api-subscription-key": SARVAM_VOICE_API_KEY}
    files = {"file": (file.filename or "audio.wav", content, file.content_type or "audio/wav")}
    data = {"model": "saarika:v2.5", "language_code": language}
    async with httpx.AsyncClient(timeout=60) as hc:
        r = await hc.post(SARVAM_STT_URL, headers=headers, files=files, data=data)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Sarvam STT {r.status_code}: {r.text[:200]}")
    return r.json()


# ============ Ratings ============
@api_router.post("/ratings")
async def add_rating(body: RatingCreate, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    now = datetime.now(timezone.utc)
    doc = {
        "rating_id": f"rate_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "name": user.get("name"),
        "rating": body.rating,
        "comment": (body.comment or "")[:500],
        "created_at": now,
    }
    await db.ratings.insert_one(doc.copy())
    doc.pop("_id", None)
    return {"ok": True, "rating_id": doc["rating_id"]}

@api_router.get("/ratings/mine")
async def my_rating(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    docs = await db.ratings.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(10)
    return docs


# ============ Assistants list ============
@api_router.get("/assistants")
async def list_assistants():
    return {"assistants": list(ASSISTANT_PROMPTS.keys()), "count": len(ASSISTANT_PROMPTS)}


# ============ Startup indexes ============
@app.on_event("startup")
async def _startup():
    try:
        await db.users.create_index("user_id", unique=True)
        await db.users.create_index("email", unique=False, sparse=True)
        await db.sessions.create_index("token", unique=True)
        await db.sessions.create_index("user_id")
        await db.sessions.create_index("expires_at", expireAfterSeconds=0)
        await db.memories.create_index([("user_id", 1), ("assistant_id", 1)])
        await db.conversations.create_index([("user_id", 1), ("updated_at", -1)])
        await db.conversations.create_index([("user_id", 1), ("assistant_id", 1), ("updated_at", -1)])
        await db.messages.create_index([("conversation_id", 1), ("created_at", 1)])
        await db.auth_attempts.create_index("expires_at", expireAfterSeconds=0)
        await db.auth_attempts.create_index("email", unique=True)
        await db.ratings.create_index("user_id")
    except Exception as e:
        logger.warning(f"index err: {e}")

@app.on_event("shutdown")
async def _shutdown():
    client.close()


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])
