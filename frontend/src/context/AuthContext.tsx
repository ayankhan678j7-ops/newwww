import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchMe, getToken, loginGuest, loginGoogle, logout as apiLogout, setToken, UserObj } from '@/src/api/client';

interface Ctx {
  user: UserObj | null;
  loading: boolean;
  signInGuest: (name?: string) => Promise<void>;
  signInGoogle: (name: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<Ctx>({
  user: null, loading: true,
  signInGuest: async () => {},
  signInGoogle: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserObj | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const tok = await getToken();
      if (!tok) { setUser(null); return; }
      const me = await fetchMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => { await refresh(); setLoading(false); })();
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
    <AuthCtx.Provider value={{ user, loading, signInGuest, signInGoogle, signUpWithEmail, signInWithEmail, signOut, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() { return useContext(AuthCtx); }
