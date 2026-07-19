import { storage } from '@/src/utils/storage';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
const TOKEN_KEY = 'jarvis_token';

export async function getToken(): Promise<string | null> {
  return await storage.getItem(TOKEN_KEY);
}
export async function setToken(t: string) {
  await storage.setItem(TOKEN_KEY, t);
}
export async function clearToken() {
  await storage.removeItem(TOKEN_KEY);
}

async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as any),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...init, headers });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.detail || data?.raw || `HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data as T;
}

// ---- Auth ----
export type UserObj = { user_id: string; name: string; email: string | null; mode: string; created_at: string; picture: string | null };

export async function loginGuest(name?: string): Promise<{ user: UserObj; token: string }> {
  return await request('/auth/guest', { method: 'POST', body: JSON.stringify({ name }) });
}
export async function loginGoogle(name: string, email: string): Promise<{ user: UserObj; token: string }> {
  return await request('/auth/google', { method: 'POST', body: JSON.stringify({ name, email }) });
}
export async function signUpEmail(name: string, email: string, password: string): Promise<{ user: UserObj; token: string }> {
  return await request('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
}
export async function signInEmail(email: string, password: string): Promise<{ user: UserObj; token: string }> {
  return await request('/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });
}
export async function fetchMe(): Promise<UserObj> {
  return await request('/auth/me');
}
export async function logout(): Promise<void> {
  try { await request('/auth/logout', { method: 'POST' }); } catch {}
  await clearToken();
}
export async function deleteAccount(): Promise<void> {
  await request('/auth/account', { method: 'DELETE' });
  await clearToken();
}

// ---- Chat ----
export type ChatMsg = { role: 'user' | 'assistant' | 'system'; content: string };
export interface ChatReply {
  conversation_id: string;
  message: ChatMsg;
  citations?: { title: string; url: string }[] | null;
}

export async function sendChat(payload: {
  conversation_id?: string;
  assistant_id: string;
  messages: ChatMsg[];
  language?: string;
  use_memory?: boolean;
  use_search?: boolean;
}): Promise<ChatReply> {
  return await request('/chat', { method: 'POST', body: JSON.stringify(payload) });
}

export type StreamEvent =
  | { type: 'meta'; conversation_id: string }
  | { type: 'delta'; content: string }
  | { type: 'citations'; items: { title: string; url: string }[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

/**
 * Stream chat replies using XMLHttpRequest so it works on BOTH React Native and web
 * (fetch().body.getReader() is not available on RN / Hermes).
 *
 * XHR delivers responseText progressively via readyState=3. We track lastIdx to
 * emit only NEW characters as they arrive, and buffer partial JSON lines.
 *
 * Returns { abort, done }. `done` rejects on network/HTTP error so caller can
 * fall back to non-streaming.
 */
export async function streamChat(
  payload: {
    conversation_id?: string;
    assistant_id: string;
    messages: ChatMsg[];
    language?: string;
    use_memory?: boolean;
    use_search?: boolean;
  },
  onEvent: (ev: StreamEvent) => void,
): Promise<{ abort: () => void; done: Promise<void> }> {
  const token = await getToken();
  const xhr = new XMLHttpRequest();
  let lastIdx = 0;
  let buf = '';
  let aborted = false;

  const flush = (final: boolean) => {
    const text = (xhr as any).responseText ?? '';
    if (text.length > lastIdx) {
      buf += text.slice(lastIdx);
      lastIdx = text.length;
    }
    if (buf.includes('\n')) {
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        const s = line.trim();
        if (!s) continue;
        try { onEvent(JSON.parse(s) as StreamEvent); } catch { /* ignore parse errors */ }
      }
    }
    if (final && buf.trim()) {
      try { onEvent(JSON.parse(buf.trim()) as StreamEvent); } catch { /* ignore */ }
      buf = '';
    }
  };

  const done = new Promise<void>((resolve, reject) => {
    xhr.onreadystatechange = () => {
      if (aborted) return;
      // readyState 3 = LOADING (partial data available); 4 = DONE
      if (xhr.readyState === 3) {
        flush(false);
      } else if (xhr.readyState === 4) {
        flush(true);
        const status = xhr.status;
        if (status >= 200 && status < 300) resolve();
        else if (status === 0) reject(new Error('Network error (status 0)'));
        else reject(new Error(`HTTP ${status}: ${(xhr as any).responseText?.slice(0, 200) || ''}`));
      }
    };
    xhr.onerror = () => { if (!aborted) reject(new Error('Network error during streaming')); };
    xhr.ontimeout = () => { if (!aborted) reject(new Error('Streaming timeout')); };
    try {
      xhr.open('POST', `${BASE}/api/chat/stream`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'application/x-ndjson');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(JSON.stringify(payload));
    } catch (e: any) {
      reject(new Error(`Stream open failed: ${e?.message ?? e}`));
    }
  });

  return { abort: () => { aborted = true; try { xhr.abort(); } catch {} }, done };
}

// ---- Memory ----
export interface Memory { memory_id: string; user_id: string; assistant_id?: string | null; category: string; content: string; created_at: string }
export async function listMemories(assistantId?: string): Promise<Memory[]> {
  const qs = assistantId ? `?assistant_id=${encodeURIComponent(assistantId)}` : '';
  return await request(`/memory${qs}`);
}
export async function addMemory(content: string, category = 'general', assistantId?: string | null): Promise<Memory> {
  return await request('/memory', { method: 'POST', body: JSON.stringify({ content, category, assistant_id: assistantId ?? null }) });
}
export async function deleteMemory(id: string): Promise<void> {
  await request(`/memory/${id}`, { method: 'DELETE' });
}
export async function toggleMemory(disabled: boolean): Promise<void> {
  await request('/memory/toggle', { method: 'POST', body: JSON.stringify({ disabled }) });
}

// ---- Conversations ----
export interface ConvItem { conversation_id: string; user_id: string; assistant_id: string; title: string; updated_at: string; created_at: string }
export async function listConversations(assistantId?: string): Promise<ConvItem[]> {
  const qs = assistantId ? `?assistant_id=${encodeURIComponent(assistantId)}` : '';
  return await request(`/conversations${qs}`);
}
export async function getConversation(id: string): Promise<{ conversation: ConvItem; messages: any[] }> {
  return await request(`/conversations/${id}`);
}
export async function deleteConversation(id: string): Promise<void> {
  await request(`/conversations/${id}`, { method: 'DELETE' });
}

// ---- Search ----
export async function searchWeb(query: string): Promise<any> {
  return await request('/search', { method: 'POST', body: JSON.stringify({ query, depth: 'basic', max_results: 5 }) });
}

// ---- Voice ----
export async function tts(text: string, language = 'en-IN', speaker = 'anushka'): Promise<{ audio_base64: string; mime: string }> {
  return await request('/tts', { method: 'POST', body: JSON.stringify({ text, language, speaker }) });
}

export async function stt(uri: string, language = 'unknown'): Promise<{ transcript?: string; language_code?: string }> {
  const token = await getToken();
  const form = new FormData();
  // @ts-ignore React Native FormData accepts { uri, name, type }
  form.append('file', { uri, name: 'audio.wav', type: 'audio/wav' });
  form.append('language', language);
  const res = await fetch(`${BASE}/api/stt`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token ?? ''}` },
    body: form as any,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || 'STT failed');
  return data;
}

// ---- Ratings ----
export async function submitRating(rating: number, comment?: string): Promise<{ ok: boolean }> {
  return await request('/ratings', { method: 'POST', body: JSON.stringify({ rating, comment }) });
}
