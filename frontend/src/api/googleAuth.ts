/**
 * Emergent-managed Google OAuth for Expo (works in Expo Go + native builds + web).
 *
 * Flow:
 *   1. Open https://auth.emergentagent.com/?redirect=<app_url> in a browser.
 *   2. User completes Google sign-in.
 *   3. We are returned to <app_url>#session_id=... (or ?session_id=... on mobile).
 *   4. Exchange the session_id for {email, name, picture} via
 *      https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data
 *   5. Caller hands (name, email) to our backend `/api/auth/google` via AuthContext.signInGoogle.
 */
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const AUTH_URL = 'https://auth.emergentagent.com/';
const SESSION_DATA_URL = 'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data';

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  session_token?: string;
}

function _redirectUrl(): string {
  if (Platform.OS === 'web') {
    // MUST point to an existing route (root '/') so the router mounts and can read the session_id.
    return `${window.location.origin}/`;
  }
  // On Expo Go this returns `exp://...`; in a native build it's `jarvisai://` from the app.json scheme.
  return Linking.createURL('');
}

export function parseSessionIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Support both '#session_id=...' and '?session_id=...'
  try {
    const u = new URL(url);
    const fromQuery = u.searchParams.get('session_id');
    if (fromQuery) return fromQuery;
    if (u.hash) {
      const hash = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash;
      const params = new URLSearchParams(hash);
      const s = params.get('session_id');
      if (s) return s;
    }
  } catch {
    // Fall through to regex — some deep links aren't strictly URL-shaped.
  }
  const m = /[#?&]session_id=([^&]+)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function exchangeSessionIdForProfile(sessionId: string): Promise<GoogleProfile> {
  const res = await fetch(SESSION_DATA_URL, {
    method: 'GET',
    headers: { 'X-Session-ID': sessionId },
  });
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(data?.detail || data?.raw || `Emergent auth HTTP ${res.status}`);
  }
  if (!data?.email) {
    throw new Error('Google returned no email — try again.');
  }
  return data as GoogleProfile;
}

/**
 * Kick off the Google login flow.
 * Mobile: opens the auth session and awaits the redirect; returns a profile.
 * Web: performs a full-page redirect and NEVER resolves — the caller should
 * expect the app to reload and the session_id to be picked up on mount.
 */
export async function startGoogleLogin(): Promise<GoogleProfile | null> {
  const redirect = _redirectUrl();
  const authUrl = `${AUTH_URL}?redirect=${encodeURIComponent(redirect)}`;

  if (Platform.OS === 'web') {
    window.location.href = authUrl;
    return null; // full redirect — nothing to await
  }

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
  if (result.type !== 'success' || !result.url) {
    if (result.type === 'cancel' || result.type === 'dismiss') return null;
    throw new Error(`Google sign-in did not complete (${result.type})`);
  }
  const sessionId = parseSessionIdFromUrl(result.url);
  if (!sessionId) {
    throw new Error('Missing session_id in redirect URL.');
  }
  return await exchangeSessionIdForProfile(sessionId);
}
