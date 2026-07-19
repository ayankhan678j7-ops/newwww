import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  fetchMe,
  getToken,
  loginGuest,
  loginGoogle,
  logout as apiLogout,
  setToken,
  signInEmail,
  signUpEmail,
  UserObj,
} from '@/src/api/client';
import { exchangeSessionIdForProfile, parseSessionIdFromUrl } from '@/src/api/googleAuth';

interface Ctx {
  user: UserObj | null;
  loading: boolean;
  signInGuest: (name?: string) => Promise<void>;
  signInGoogle: (name: string, email: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<Ctx>({
  user: null,
  loading: true,
  signInGuest: async () => {},
  signInGoogle: async () => {},
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserObj | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const tok = await getToken();
      if (!tok) {
        setUser(null);
        return;
      }
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      // On web, if the browser was redirected back from Emergent auth with
      // a session_id in the hash/query, exchange it BEFORE deciding whether
      // to route to /auth. Otherwise the router would strip the fragment.
      if (Platform.OS === 'web') {
        try {
          const href = typeof window !== 'undefined' ? window.location.href : '';
          const sid = parseSessionIdFromUrl(href);
          if (sid) {
            try { window.history.replaceState(null, '', window.location.pathname); } catch {}
            try {
              const profile = await exchangeSessionIdForProfile(sid);
              const { user: u, token } = await loginGoogle(
                profile.name || profile.email.split('@')[0],
                profile.email,
              );
              await setToken(token);
              setUser(u);
              setLoading(false);
              return;
            } catch (e) {
              // fall through to normal session check
              console.warn('Google session exchange failed', e);
            }
          }
        } catch {}
      }
      await refresh();
      setLoading(false);
    })();
  }, []);

  const signInGuest = async (name?: string) => {
    const { user: u, token } = await loginGuest(name);
    await setToken(token);
    setUser(u);
  };
  const signInGoogle = async (name: string, email: string) => {
    const { user: u, token } = await loginGoogle(name, email);
    await setToken(token);
    setUser(u);
  };
  const signUpWithEmail = async (name: string, email: string, password: string) => {
    const { user: u, token } = await signUpEmail(name, email, password);
    await setToken(token);
    setUser(u);
  };
  const signInWithEmail = async (email: string, password: string) => {
    const { user: u, token } = await signInEmail(email, password);
    await setToken(token);
    setUser(u);
  };
  const signOut = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        signInGuest,
        signInGoogle,
        signUpWithEmail,
        signInWithEmail,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
