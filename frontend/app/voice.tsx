import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AudioModule, useAudioRecorder, RecordingPresets, createAudioPlayer } from 'expo-audio';
import { AIOrb } from '@/src/components/AIOrb';
import { useTheme } from '@/src/context/ThemeContext';
import { fontSize, radius, spacing } from '@/src/theme/colors';
import { sendChat, stt, tts } from '@/src/api/client';
import { stripMarkdown } from '@/src/utils/markdown';

type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking';

export default function VoiceScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<VoiceState>('idle');
  const [heard, setHeard] = useState<string>('');
  const [reply, setReply] = useState<string>('');
  const [language, setLanguage] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const playerRef = useRef<any>(null);

  const startRec = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Microphone permission needed',
          'JARVIS needs microphone access to hear you. Please enable it in Settings.',
        );
        return;
      }
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('listening');
    } catch (e: any) {
      Alert.alert('Recording failed', e.message ?? 'Unknown');
      setState('idle');
    }
  };

  const stopAndProcess = async () => {
    try {
      setState('thinking');
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) { setState('idle'); return; }
      const sttRes = await stt(uri, language);
      const transcript = (sttRes as any)?.transcript ?? '';
      setHeard(transcript);
      if (!transcript.trim()) {
        setReply("I couldn't hear you clearly. Please try again.");
        setState('idle');
        return;
      }
      const chatRes = await sendChat({
        assistant_id: 'voice',
        messages: [{ role: 'user', content: transcript }],
        use_memory: true,
      });
      const answer = stripMarkdown(chatRes.message.content);
      setReply(answer);
      setState('speaking');

      // TTS
      try {
        const audio = await tts(answer, language, 'anushka');
        const dataUri = `data:${audio.mime};base64,${audio.audio_base64}`;
        if (playerRef.current) { try { playerRef.current.remove(); } catch {} }
        const player = createAudioPlayer({ uri: dataUri });
        playerRef.current = player;
        player.play();
        // rough duration guess
        setTimeout(() => setState('idle'), Math.max(2500, Math.min(20000, answer.length * 60)));
      } catch (e) {
        setState('idle');
      }
    } catch (e: any) {
      Alert.alert('Voice error', e.message ?? 'Unknown');
      setState('idle');
    }
  };

  const active = state !== 'idle';

  const label = {
    idle: 'Tap to speak',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
  }[state];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top','bottom']}>
      <View style={styles.header}>
        <TouchableOpacity testID="voice-back-btn" onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          testID="voice-lang-btn"
          onPress={() => setLanguage(l => (l === 'en-IN' ? 'hi-IN' : 'en-IN'))}
          style={[styles.langBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Ionicons name="language" size={14} color={c.text} />
          <Text style={{ color: c.text, fontWeight: '700', fontSize: fontSize.xs, marginLeft: 4 }}>
            {language === 'en-IN' ? 'EN' : 'HI'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.center}>
        <AIOrb size={220} active={active} />
        <Text style={[styles.state, { color: c.text }]}>{label}</Text>
        {heard ? (
          <Text style={[styles.heard, { color: c.textMuted }]} numberOfLines={2}>You: “{heard}”</Text>
        ) : null}
        {reply ? (
          <View style={[styles.replyCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.replyText, { color: c.text }]}>{reply}</Text>
          </View>
        ) : (
          <Text style={[styles.hint, { color: c.textDim }]}>
            Ask anything in English, Hindi, or Hinglish
          </Text>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          testID="voice-mic-btn"
          onPress={() => (state === 'listening' ? stopAndProcess() : startRec())}
          disabled={state === 'thinking' || state === 'speaking'}
          style={[styles.mic, { backgroundColor: state === 'listening' ? c.error : c.primary, opacity: state === 'thinking' || state === 'speaking' ? 0.5 : 1 }]}
        >
          <Ionicons name={state === 'listening' ? 'stop' : 'mic'} size={30} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.tapHint, { color: c.textMuted }]}>
          {state === 'listening' ? 'Tap to stop' : 'Tap and speak'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm,
  },
  iconBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  langBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 34, borderRadius: radius.pill, borderWidth: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  state: { marginTop: spacing.xl, fontSize: fontSize.xxl, fontWeight: '800', letterSpacing: 0.5 },
  heard: { marginTop: spacing.sm, fontSize: fontSize.md, textAlign: 'center' },
  hint: { marginTop: spacing.md, fontSize: fontSize.sm },
  replyCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xxl,
    borderWidth: 1,
    maxHeight: 200,
  },
  replyText: { fontSize: fontSize.md, lineHeight: 22 },
  controls: { alignItems: 'center', paddingBottom: spacing.xl },
  mic: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  tapHint: { marginTop: spacing.md, fontSize: fontSize.sm },
});
