// JARVIS AI theme tokens (mapped from design_guidelines.json)
export const colors = {
  dark: {
    bg: '#0B0F19',
    bgAlt: '#0A0E17',
    surface: '#131B2B',
    surface2: '#1E293B',
    surfaceHi: '#243044',
    primary: '#6366F1',
    primaryGlow: 'rgba(99,102,241,0.5)',
    secondary: '#06B6D4',
    accent: '#22D3EE',
    text: '#F8FAFC',
    textMuted: '#94A3B8',
    textDim: '#64748B',
    border: '#1E293B',
    borderHi: '#334155',
    glass: 'rgba(19,27,43,0.72)',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    userBubble: '#6366F1',
    aiBubble: '#131B2B',
  },
  light: {
    bg: '#F8FAFC',
    bgAlt: '#F1F5F9',
    surface: '#FFFFFF',
    surface2: '#F1F5F9',
    surfaceHi: '#E2E8F0',
    primary: '#4F46E5',
    primaryGlow: 'rgba(79,70,229,0.25)',
    secondary: '#0891B2',
    accent: '#06B6D4',
    text: '#0F172A',
    textMuted: '#64748B',
    textDim: '#94A3B8',
    border: '#E2E8F0',
    borderHi: '#CBD5E1',
    glass: 'rgba(255,255,255,0.85)',
    error: '#DC2626',
    success: '#059669',
    warning: '#D97706',
    userBubble: '#4F46E5',
    aiBubble: '#FFFFFF',
  },
} as const;

export type ThemeName = 'dark' | 'light';
export type ThemeColors = typeof colors.dark;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const fontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, hero: 32, huge: 42 };
