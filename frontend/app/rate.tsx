import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/src/context/ThemeContext';
import { fontSize, radius, spacing } from '@/src/theme/colors';
import { submitRating } from '@/src/api/client';

export default function Rate() {
  const { c } = useTheme();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (rating < 1 || busy) return;
    setBusy(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await submitRating(rating, comment.trim() || undefined);
      setDone(true);
    } catch (e: any) {
      Alert.alert('Failed', e.message ?? 'Unknown');
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} testID="rate-page">
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity testID="rate-back-btn" onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="chevron-back" size={20} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.text }]}>Rate & Review</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {done ? (
          <View style={[styles.thanks, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.checkCircle, { backgroundColor: c.success + '22' }]}>
              <Ionicons name="checkmark" size={32} color={c.success} />
            </View>
            <Text style={[styles.thanksTitle, { color: c.text }]}>Thank you!</Text>
            <Text style={[styles.thanksText, { color: c.textMuted }]}>
              Your feedback makes JARVIS smarter. If you enjoyed the app, please also rate us on the Play Store when it's live.
            </Text>
            <TouchableOpacity testID="rate-done-btn" onPress={() => router.back()} style={[styles.doneBtn, { backgroundColor: c.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.h, { color: c.text }]}>How is your JARVIS experience?</Text>
            <Text style={[styles.p, { color: c.textMuted }]}>Your rating helps us improve. Every response is read by the team.</Text>

            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity
                  key={i}
                  testID={`rate-star-${i}`}
                  onPress={() => {
                    setRating(i);
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                  }}
                  hitSlop={6}
                >
                  <Ionicons
                    name={i <= rating ? 'star' : 'star-outline'}
                    size={44}
                    color={i <= rating ? c.warning : c.textDim}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.starLabel, { color: c.textMuted }]}>
              {rating === 0 ? 'Tap a star to rate' :
                rating === 5 ? 'Amazing! Thank you 🎉' :
                rating === 4 ? 'Great — thanks!' :
                rating === 3 ? 'Fair — tell us more below' :
                rating === 2 ? 'Below expectations — what would help?' :
                'We are sorry — please tell us what went wrong'}
            </Text>

            <TextInput
              testID="rate-comment-input"
              placeholder="Tell us what you love or what to improve (optional)"
              placeholderTextColor={c.textDim}
              value={comment}
              onChangeText={setComment}
              multiline
              style={[styles.comment, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
            />

            <TouchableOpacity
              testID="rate-submit-btn"
              onPress={submit}
              disabled={rating < 1 || busy}
              style={[styles.submit, { backgroundColor: rating >= 1 ? c.primary : c.surface2, opacity: busy ? 0.7 : 1 }]}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: fontSize.md }}>Submit feedback</Text>}
            </TouchableOpacity>
          </>
        )}
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
  h: { fontSize: fontSize.xxl, fontWeight: '800', marginBottom: 6 },
  p: { fontSize: fontSize.md, lineHeight: 22 },
  stars: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xxl, marginBottom: spacing.sm, paddingHorizontal: 4 },
  starLabel: { textAlign: 'center', fontSize: fontSize.sm, marginBottom: spacing.xl },
  comment: {
    minHeight: 120, borderWidth: 1, borderRadius: radius.lg,
    padding: spacing.md, fontSize: fontSize.md, textAlignVertical: 'top',
  },
  submit: {
    marginTop: spacing.lg, height: 54, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center',
  },
  thanks: {
    padding: spacing.xl, borderRadius: radius.xxl, borderWidth: 1, alignItems: 'center',
  },
  checkCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  thanksTitle: { fontSize: fontSize.xxl, fontWeight: '800' },
  thanksText: { marginTop: 8, fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
  doneBtn: { marginTop: spacing.xl, paddingHorizontal: spacing.xl, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
