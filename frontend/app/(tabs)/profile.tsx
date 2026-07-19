import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { deleteAccount } from '@/src/api/client';
import { fontSize, radius, spacing } from '@/src/theme/colors';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { c, scheme, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const onDelete = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your user, memories, and chat history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try { await deleteAccount(); await signOut(); router.replace('/auth'); }
            catch (e: any) { Alert.alert('Failed', e.message); }
          }
        },
      ],
    );
  };

  const onLogout = async () => {
    await signOut();
    router.replace('/auth');
  };

  const Row = ({ icon, title, sub, onPress, right, destructive, testID }: any) => (
    <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.7} style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: (destructive ? c.error : c.primary) + '22' }]}>
        <Ionicons name={icon} size={18} color={destructive ? c.error : c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: destructive ? c.error : c.text }]}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: c.textMuted }]}>{sub}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={c.textMuted} />}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Profile</Text>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 + insets.bottom }}>
        <View style={[styles.userCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.avatar, { backgroundColor: c.primary + '33' }]}>
            <Text style={{ color: c.primary, fontWeight: '800', fontSize: 22 }}>
              {(user?.name ?? 'J').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: c.text }]}>{user?.name ?? 'Guest'}</Text>
            <Text style={[styles.userMeta, { color: c.textMuted }]}>
              {user?.email ?? (user?.mode === 'guest' ? 'Guest session' : 'Signed in')}
            </Text>
          </View>
        </View>

        <Text style={[styles.section, { color: c.textMuted }]}>APPEARANCE</Text>
        <Row
          testID="profile-theme-row"
          icon="moon"
          title={scheme === 'dark' ? 'Dark mode' : 'Light mode'}
          sub="Tap to toggle"
          onPress={toggle}
          right={<Switch value={scheme === 'dark'} onValueChange={toggle} trackColor={{ true: c.primary, false: c.border }} thumbColor="#fff" />}
        />

        <Text style={[styles.section, { color: c.textMuted }]}>ACTIVITY</Text>
        <Row testID="profile-history-row" icon="time" title="Chat history" sub="All your conversations" onPress={() => router.push('/history')} />
        <Row testID="profile-memory-row" icon="server" title="Memory" sub="Manage what JARVIS remembers" onPress={() => router.push('/(tabs)/memory')} />

        <Text style={[styles.section, { color: c.textMuted }]}>PRIVACY</Text>
        <Row testID="profile-privacy-row" icon="shield-checkmark" title="Privacy Policy" sub="How we handle your data" onPress={() => router.push('/privacy')} />
        <Row testID="profile-terms-row" icon="document-text" title="Terms & Conditions" sub="Rules of using JARVIS" onPress={() => router.push('/terms')} />
        <Row testID="profile-rate-row" icon="star" title="Rate & Review" sub="Share your feedback" onPress={() => router.push('/rate')} />
        <Row testID="profile-export-row" icon="download" title="Export my data" sub="Coming soon" onPress={() => Alert.alert('Export', 'JSON export coming in a future update.')} />

        <Text style={[styles.section, { color: c.textMuted }]}>ABOUT</Text>
        <Row testID="profile-about-row" icon="information-circle" title="About JARVIS AI" sub="Version 1.0 · Powered by Sarvam AI" onPress={() => Alert.alert('JARVIS AI', 'Ultimate personal AI. Powered by Sarvam AI + Tavily. Health/Finance/Legal info is educational only.')} />

        <Text style={[styles.section, { color: c.textMuted }]}>ACCOUNT</Text>
        <Row testID="profile-logout-row" icon="log-out" title="Log out" onPress={onLogout} />
        <Row testID="profile-delete-row" icon="trash" title="Delete account" destructive onPress={onDelete} />

        <Text style={[styles.footer, { color: c.textDim }]}>
          JARVIS AI complies with Google Play policies. Health, Finance, Legal features are educational only, not professional advice.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { fontSize: fontSize.hero, fontWeight: '800' },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.xxl, borderWidth: 1,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: fontSize.xl, fontWeight: '800' },
  userMeta: { fontSize: fontSize.sm, marginTop: 2 },
  section: { fontSize: 11, letterSpacing: 1.5, fontWeight: '800', marginTop: spacing.xl, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.sm,
  },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: fontSize.md, fontWeight: '700' },
  rowSub: { fontSize: fontSize.xs, marginTop: 2 },
  footer: { marginTop: spacing.xxl, fontSize: fontSize.xs, textAlign: 'center', lineHeight: 16 },
});
