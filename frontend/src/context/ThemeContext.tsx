import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { colors, ThemeColors, ThemeName } from '@/src/theme/colors';
import { storage } from '@/src/utils/storage';

const KEY = 'jarvis_theme';

interface Ctx {
  scheme: ThemeName;
  c: ThemeColors;
  toggle: () => void;
  setScheme: (n: ThemeName) => void;
}

const ThemeCtx = createContext<Ctx>({ scheme: 'dark', c: colors.dark, toggle: () => {}, setScheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useColorScheme();
  const [scheme, setSchemeState] = useState<ThemeName>('dark');

  useEffect(() => {
    (async () => {
      const stored = await storage.getItem(KEY);
      if (stored === 'dark' || stored === 'light') setSchemeState(stored);
      // default remains 'dark' per design guidelines
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<Ctx>(() => ({
    scheme,
    c: colors[scheme],
    setScheme: (n) => { setSchemeState(n); storage.setItem(KEY, n); },
    toggle: () => {
      const next: ThemeName = scheme === 'dark' ? 'light' : 'dark';
      setSchemeState(next);
      storage.setItem(KEY, next);
    },
  }), [scheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
