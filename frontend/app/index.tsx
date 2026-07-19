import { useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { AIOrb } from '@/src/components/AIOrb';
import { fontSize, spacing } from '@/src/theme/colors';

export default function Index() {
  const { user, loading } = useAuth();
  const { c } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      if (user) router.replace('/(tabs)');
      else router.replace('/auth');
    }, 900);
    return () => clearTimeout(t);
  }, [loading, user, router]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]} testID="splash-screen">
      <AIOrb size={180} active={false} />
      <Text style={[styles.title, { color: c.text }]}>JARVIS AI</Text>
      <Text style={[styles.subtitle, { color: c.textMuted }]}>Your all-in-one AI companion</Text>
      {loading && <ActivityIndicator style={{ marginTop: 24 }} color={c.primary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    marginTop: spacing.xxl,
    fontSize: fontSize.hero,
    fontWeight: '800',
    letterSpacing: 2,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
  },
});
