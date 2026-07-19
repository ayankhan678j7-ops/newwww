import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AIOrb } from '@/src/components/AIOrb';
import { AssistantCard } from '@/src/components/AssistantCard';
import { ASSISTANTS, CATEGORIES, AssistantCategory } from '@/src/config/assistants';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { fontSize, radius, spacing } from '@/src/theme/colors';

export default function Home() {
  const { c } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<AssistantCategory | 'All'>('All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ASSISTANTS.filter(a => {
      if (cat !== 'All' && a.category !== cat) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.tagline.toLowerCase().includes(q) || a.id.includes(q);
    });
  }, [query, cat]);

  const openAssistant = (id: string) => {
    router.push({ pathname: '/chat', params: { assistant: id } });
  };

  const quickChips = [
    { label: 'Plan my day', id: 'personal' },
    { label: 'Homework help', id: 'study' },
    { label: 'Trip planner', id: 'travel' },
    { label: 'Code debug', id: 'coding' },
    { label: 'Draft WhatsApp', id: 'communication' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Sticky top: greeting + search bar */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: c.bg }}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hello, { color: c.textMuted }]}>{`Namaste,`}</Text>
            <Text style={[styles.helloName, { color: c.text }]} numberOfLines={1}>
              {user?.name ?? 'Friend'}
            </Text>
          </View>
          <TouchableOpacity testID="header-history-btn" onPress={() => router.push('/history')} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="time-outline" size={20} color={c.text} />
          </TouchableOpacity>
          <TouchableOpacity testID="header-orb-btn" onPress={() => router.push('/voice')} style={{ marginLeft: 8 }}>
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <AIOrb size={38} />
            </View>
          </TouchableOpacity>
        </View>

        {/* STICKY SEARCH BAR — always visible */}
        <View style={styles.searchOuter}>
          <View style={[styles.searchWrap, { backgroundColor: c.surface, borderColor: query ? c.primary : c.border }]}>
            <Ionicons name="search" size={18} color={c.textMuted} />
            <TextInput
              testID="assistant-search-input"
              placeholder="Search 42 AI experts…"
              placeholderTextColor={c.textDim}
              value={query}
              onChangeText={setQuery}
              style={[styles.searchInput, { color: c.text }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <TouchableOpacity testID="search-clear-btn" onPress={() => setQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={c.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity testID="search-voice-btn" onPress={() => router.push('/voice')} style={styles.searchVoiceBtn}>
              <Ionicons name="mic" size={18} color={c.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero prompt */}
        <View style={[styles.hero, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.heroTitle, { color: c.text }]}>What can I help with today?</Text>
          <Pressable
            testID="hero-input-open"
            onPress={() => router.push({ pathname: '/chat', params: { assistant: 'personal' } })}
            style={[styles.heroInput, { backgroundColor: c.bg, borderColor: c.border }]}
          >
            <Ionicons name="sparkles" size={16} color={c.primary} />
            <Text style={[styles.heroInputText, { color: c.textMuted }]}>Ask JARVIS anything…</Text>
            <View style={{ flex: 1 }} />
            <View style={[styles.micDot, { backgroundColor: c.primary }]}>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </Pressable>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
            {quickChips.map(q => (
              <TouchableOpacity
                key={q.label}
                testID={`quick-chip-${q.id}`}
                onPress={() => router.push({ pathname: '/chat', params: { assistant: q.id, prompt: q.label } })}
                style={[styles.quickChip, { backgroundColor: c.bg, borderColor: c.border }]}
              >
                <Text style={[styles.quickChipText, { color: c.text }]}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Category chip row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {(['All', ...CATEGORIES] as const).map(k => {
            const active = cat === k;
            return (
              <TouchableOpacity
                key={k}
                testID={`category-chip-${k}`}
                onPress={() => setCat(k as any)}
                style={[styles.chip, { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary + '22' : c.surface }]}
              >
                <Text style={[styles.chipText, { color: active ? c.primary : c.textMuted }]}>{k}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Grid */}
        <View style={styles.grid}>
          {filtered.map(a => (
            <View key={a.id} style={styles.cell}>
              <AssistantCard a={a} onPress={() => openAssistant(a.id)} />
            </View>
          ))}
          {filtered.length === 0 && (
            <View style={{ padding: spacing.xl, width: '100%' }}>
              <Text style={{ color: c.textMuted, textAlign: 'center' }}>No assistants match your search.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  hello: { fontSize: fontSize.sm },
  helloName: { fontSize: fontSize.xl, fontWeight: '800' },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  searchOuter: {
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
    paddingBottom: spacing.md,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingRight: 6,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, height: '100%' },
  searchVoiceBtn: {
    width: 40, height: 40, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  hero: {
    margin: spacing.lg,
    marginTop: 4,
    padding: spacing.lg,
    borderRadius: radius.xxl,
    borderWidth: 1,
  },
  heroTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  heroInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  heroInputText: { fontSize: fontSize.md },
  micDot: {
    width: 34, height: 34, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  quickChip: {
    paddingHorizontal: 14, height: 36, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0,
  },
  quickChipText: { fontSize: fontSize.sm, fontWeight: '600' },
  catRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
    paddingBottom: spacing.md,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14, height: 36, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0,
  },
  chipText: { fontSize: fontSize.sm, fontWeight: '700' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: 0,
  },
  cell: {
    width: '50%',
    padding: spacing.sm,
  },
});
