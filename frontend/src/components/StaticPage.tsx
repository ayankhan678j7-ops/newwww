import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/context/ThemeContext';
import { fontSize, radius, spacing } from '@/src/theme/colors';

interface Props {
  title: string;
  children: React.ReactNode;
  testID?: string;
}

export function StaticPage({ title, children, testID }: Props) {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} testID={testID}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity testID="static-back-btn" onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{title}</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
        {children}
      </ScrollView>
    </View>
  );
}

interface SecProps { title: string; children: React.ReactNode }
export function Section({ title, children }: SecProps) {
  const { c } = useTheme();
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={[secStyles.h, { color: c.text }]}>{title}</Text>
      <View style={{ height: 8 }} />
      {children}
    </View>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <Text style={[secStyles.p, { color: c.textMuted }]}>{children}</Text>;
}

export function Bullet({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={secStyles.bullet}>
      <View style={[secStyles.dot, { backgroundColor: c.primary }]} />
      <Text style={[secStyles.p, { color: c.textMuted, flex: 1 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  iconBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: '800' },
});

const secStyles = StyleSheet.create({
  h: { fontSize: fontSize.lg, fontWeight: '800' },
  p: { fontSize: fontSize.md, lineHeight: 22 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
});
