import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, RefreshControl, Switch } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { fontSize, radius, spacing } from '@/src/theme/colors';
import { addMemory, deleteMemory, listMemories, Memory, toggleMemory } from '@/src/api/client';

const CATEGORIES = ['general', 'preferences', 'style', 'topics', 'instructions'];

export default function MemoryScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Memory[]>([]);
  const [text, setText] = useState('');
  const [cat, setCat] = useState('general');
  const [disabled, setDisabledState] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const list = await listMemories();
      setItems(list);
    } catch (e: any) {
      // Not logged in etc.
    }
  };

  useEffect(() => { load(); }, []);

  const onAdd = async () => {
    const t = text.trim();
    if (!t) return;
    try {
      await addMemory(t, cat);
      setText('');
      await load();
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    }
  };

  const onDelete = (id: string) => {
    Alert.alert('Delete memory?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteMemory(id);
        await load();
      }},
    ]);
  };

  const onToggle = async (v: boolean) => {
    setDisabledState(v);
    try { await toggleMemory(v); } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Memory</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>
            JARVIS remembers what you tell it. You control everything.
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: c.text }]}>Disable memory</Text>
            <Text style={[styles.rowTag, { color: c.textMuted }]}>Skip using saved memory in replies</Text>
          </View>
          <Switch testID="memory-disable-switch" value={disabled} onValueChange={onToggle} trackColor={{ true: c.primary, false: c.border }} thumbColor="#fff" />
        </View>

        <Text style={[styles.section, { color: c.textMuted }]}>ADD MEMORY</Text>

        <View style={[styles.addWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 10 }}>
            {CATEGORIES.map(k => (
              <TouchableOpacity
                key={k}
                testID={`memory-cat-${k}`}
                onPress={() => setCat(k)}
                style={[styles.chip, { borderColor: cat === k ? c.primary : c.border, backgroundColor: cat === k ? c.primary + '22' : c.bg }]}
              >
                <Text style={{ color: cat === k ? c.primary : c.textMuted, fontWeight: '700', fontSize: fontSize.sm }}>{k}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            testID="memory-input"
            placeholder="e.g. I prefer concise answers with examples"
            placeholderTextColor={c.textDim}
            value={text}
            onChangeText={setText}
            multiline
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
          />
          <TouchableOpacity testID="memory-add-btn" onPress={onAdd} style={[styles.addBtn, { backgroundColor: c.primary }]}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Save memory</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.section, { color: c.textMuted }]}>{items.length} STORED</Text>

        {items.length === 0 && (
          <View style={[styles.empty, { borderColor: c.border }]}>
            <Ionicons name="server-outline" size={26} color={c.textDim} />
            <Text style={{ color: c.textMuted, marginTop: 8 }}>No memories yet</Text>
          </View>
        )}

        {items.map(m => (
          <View key={m.memory_id} style={[styles.memRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.dot, { backgroundColor: c.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.memCat, { color: c.textMuted }]}>{m.category.toUpperCase()}</Text>
              <Text style={[styles.memText, { color: c.text }]}>{m.content}</Text>
            </View>
            <TouchableOpacity testID={`memory-delete-${m.memory_id}`} onPress={() => onDelete(m.memory_id)}>
              <Ionicons name="trash-outline" size={18} color={c.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { fontSize: fontSize.hero, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.lg,
    borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md,
  },
  rowTitle: { fontSize: fontSize.md, fontWeight: '700' },
  rowTag: { fontSize: fontSize.xs, marginTop: 2 },
  section: { fontSize: 11, letterSpacing: 1.5, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  addWrap: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  input: {
    borderWidth: 1, borderRadius: radius.md, padding: spacing.md,
    minHeight: 80, textAlignVertical: 'top', fontSize: fontSize.md, marginTop: 8,
  },
  addBtn: {
    marginTop: spacing.md, height: 46, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' },
  memRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  memCat: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  memText: { fontSize: fontSize.md, marginTop: 2 },
});
