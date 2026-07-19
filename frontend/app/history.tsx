import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { ASSISTANT_BY_ID } from '@/src/config/assistants';
import { ConvItem, deleteConversation, listConversations } from '@/src/api/client';
import { fontSize, radius, spacing } from '@/src/theme/colors';

export default function History() {
  const { c } = useTheme();
  const router = useRouter();
  const [convs, setConvs] = useState<ConvItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setConvs(await listConversations()); } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  const onDelete = (id: string) => {
    Alert.alert('Delete conversation?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteConversation(id); await load(); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity testID="history-back-btn" onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.text }]}>History</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.primary} />}
      >
        {convs.length === 0 && (
          <View style={[styles.empty, { borderColor: c.border }]}>
            <Ionicons name="chatbubbles-outline" size={28} color={c.textDim} />
            <Text style={{ color: c.textMuted, marginTop: 8 }}>No conversations yet</Text>
          </View>
        )}

        {convs.map(cv => {
          const a = ASSISTANT_BY_ID[cv.assistant_id] ?? ASSISTANT_BY_ID.personal;
          return (
            <TouchableOpacity
              key={cv.conversation_id}
              testID={`history-item-${cv.conversation_id}`}
              onPress={() => router.push({ pathname: '/chat', params: { assistant: cv.assistant_id, conversation: cv.conversation_id } })}
              style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              <View style={[styles.icon, { backgroundColor: a.color + '22' }]}>
                <Ionicons name={a.icon} size={18} color={a.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.text }]} numberOfLines={1}>{cv.title}</Text>
                <Text style={[styles.rowSub, { color: c.textMuted }]}>{a.name} · {new Date(cv.updated_at).toLocaleString()}</Text>
              </View>
              <TouchableOpacity testID={`history-delete-${cv.conversation_id}`} onPress={() => onDelete(cv.conversation_id)} hitSlop={10}>
                <Ionicons name="trash-outline" size={18} color={c.error} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  empty: { alignItems: 'center', padding: spacing.xxl, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.sm,
  },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: fontSize.md, fontWeight: '700' },
  rowSub: { fontSize: fontSize.xs, marginTop: 2 },
});
