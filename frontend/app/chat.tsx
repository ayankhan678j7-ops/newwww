import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, ActivityIndicator, Pressable } from 'react-native';
import { KeyboardAvoidingView, KeyboardEvents } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { ASSISTANT_BY_ID, AssistantDef } from '@/src/config/assistants';
import { useTheme } from '@/src/context/ThemeContext';
import { fontSize, radius, spacing } from '@/src/theme/colors';
import { ChatMsg, getConversation, sendChat, streamChat, StreamEvent } from '@/src/api/client';
import { stripMarkdown } from '@/src/utils/markdown';

interface Citation { title: string; url: string }
interface UIMessage extends ChatMsg { id: string; citations?: Citation[]; streaming?: boolean; error?: boolean }

// ---- Blinking cursor for the streaming bubble ----
function BlinkingCursor({ color }: { color: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.15, { duration: 500, easing: Easing.inOut(Easing.quad) }),
      -1, true,
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Text style={[{ color, fontSize: fontSize.md, fontWeight: '700' }, style]}>
      ▍
    </Animated.Text>
  );
}

export default function ChatScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ assistant?: string; prompt?: string; conversation?: string }>();
  const assistantId = (params.assistant as string) || 'personal';
  const assistant: AssistantDef = ASSISTANT_BY_ID[assistantId] ?? ASSISTANT_BY_ID.personal;

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [convId, setConvId] = useState<string | undefined>(params.conversation as string | undefined);
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<null | (() => void)>(null);

  // --- Smooth typing animation state ---
  // targetBufferRef stores full content per streaming message id; the timer
  // reveals characters in the visible bubble at ~60fps until it catches up.
  const targetBufferRef = useRef<Record<string, string>>({});
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeStreamIdRef = useRef<string | null>(null);

  const disabled = assistant.status === 'coming_soon';

  const mkId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

  const stopTypingLoop = useCallback(() => {
    if (revealTimerRef.current) {
      clearInterval(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const startTypingLoop = useCallback((msgId: string) => {
    stopTypingLoop();
    activeStreamIdRef.current = msgId;
    revealTimerRef.current = setInterval(() => {
      const targetId = activeStreamIdRef.current;
      if (!targetId) { stopTypingLoop(); return; }
      const target = targetBufferRef.current[targetId] ?? '';
      setMessages(prev => {
        let changed = false;
        const next = prev.map(m => {
          if (m.id !== targetId) return m;
          if (m.content.length >= target.length) return m;
          // Reveal a natural batch each tick: min 2, max 8 chars per 25ms
          const remaining = target.length - m.content.length;
          const step = Math.max(2, Math.min(8, Math.ceil(remaining / 8)));
          changed = true;
          return { ...m, content: target.slice(0, m.content.length + step) };
        });
        return changed ? next : prev;
      });
    }, 25);
  }, [stopTypingLoop]);

  // Load existing conversation if provided
  useEffect(() => {
    (async () => {
      if (!params.conversation) return;
      try {
        const conv = await getConversation(params.conversation as string);
        const loaded: UIMessage[] = (conv.messages ?? []).map((m: any) => ({
          id: m.message_id ?? mkId(),
          role: m.role, content: m.content, citations: m.citations ?? undefined,
        }));
        setMessages(loaded);
        setConvId(conv.conversation.conversation_id);
        scrollToEnd();
      } catch {}
    })();
  }, [params.conversation]);

  useEffect(() => {
    return () => { stopTypingLoop(); };
  }, [stopTypingLoop]);

  const send = async (raw?: string) => {
    const content = (raw ?? text).trim();
    if (!content || busy || disabled) return;
    if (Platform.OS !== 'web') { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} }

    const userMsg: UIMessage = { id: mkId(), role: 'user', content };
    const aiMsg: UIMessage = { id: mkId(), role: 'assistant', content: '', streaming: true };
    const newHistory = [...messages, userMsg, aiMsg];
    setMessages(newHistory);
    setText('');
    setBusy(true);
    scrollToEnd();

    // Initialise typing buffer for the new AI message
    targetBufferRef.current[aiMsg.id] = '';
    startTypingLoop(aiMsg.id);

    const payloadMessages: ChatMsg[] = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    let receivedAny = false;
    let streamErr: string | null = null;

    const finalise = async (fullText: string, citations?: Citation[] | null) => {
      targetBufferRef.current[aiMsg.id] = fullText;
      // Wait a couple of frames for reveal to catch up, then hard-set final content
      await new Promise(r => setTimeout(r, 60));
      setMessages(prev => prev.map(m => m.id === aiMsg.id ? {
        ...m,
        content: fullText,
        citations: citations ?? m.citations,
        streaming: false,
      } : m));
      stopTypingLoop();
      activeStreamIdRef.current = null;
      scrollToEnd();
    };

    try {
      const { abort, done } = await streamChat(
        {
          conversation_id: convId,
          assistant_id: assistant.id,
          messages: payloadMessages,
          use_search: useSearch,
        },
        (ev: StreamEvent) => {
          if (ev.type === 'meta') {
            setConvId(ev.conversation_id);
          } else if (ev.type === 'delta') {
            receivedAny = true;
            targetBufferRef.current[aiMsg.id] = (targetBufferRef.current[aiMsg.id] ?? '') + ev.content;
            scrollToEnd();
          } else if (ev.type === 'citations') {
            setMessages(prev => prev.map(m => m.id === aiMsg.id ? { ...m, citations: ev.items } : m));
          } else if (ev.type === 'error') {
            streamErr = ev.message;
          }
        },
      );
      abortRef.current = abort;
      await done;

      if (streamErr && !receivedAny) throw new Error(streamErr);
      const full = targetBufferRef.current[aiMsg.id] ?? '';
      await finalise(full || (streamErr ? `⚠️ ${streamErr}` : '⚠️ No response received'));
    } catch (e: any) {
      // Fall back to non-streaming if nothing streamed in
      if (!receivedAny) {
        try {
          const reply = await sendChat({
            conversation_id: convId,
            assistant_id: assistant.id,
            messages: payloadMessages,
            use_search: useSearch,
          });
          if (reply.conversation_id) setConvId(reply.conversation_id);
          // Animate the fallback response with the same typing effect
          targetBufferRef.current[aiMsg.id] = reply.message.content;
          await new Promise(r => setTimeout(r, 300));
          await finalise(reply.message.content, reply.citations ?? undefined);
        } catch (err: any) {
          const msg = err?.message || e?.message || 'Unknown error';
          setMessages(prev => prev.map(m => m.id === aiMsg.id ? {
            ...m, content: `⚠️ ${msg}`, streaming: false, error: true,
          } : m));
          stopTypingLoop();
        }
      } else {
        // Some chunks arrived then network died — show what we have
        const partial = targetBufferRef.current[aiMsg.id] ?? '';
        await finalise(partial + '\n\n⚠️ Connection interrupted');
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  };

  const stopGeneration = () => {
    if (abortRef.current) {
      try { abortRef.current(); } catch {}
      abortRef.current = null;
    }
    stopTypingLoop();
    setBusy(false);
    setMessages(prev => prev.map(m => {
      if (!m.streaming) return m;
      const target = targetBufferRef.current[m.id] ?? m.content;
      return { ...m, content: target || m.content, streaming: false };
    }));
  };

  const startNewChat = () => {
    // Stop any in-flight stream first — do NOT lose backend history.
    if (busy) stopGeneration();
    if (Platform.OS !== 'web') { try { Haptics.selectionAsync(); } catch {} }
    // Wipe only the local screen state; every message is already persisted
    // on the backend under this assistant's own history so it stays
    // available from the History tab and from this assistant later.
    targetBufferRef.current = {};
    activeStreamIdRef.current = null;
    setMessages([]);
    setConvId(undefined);
    setText('');
    // Also drop any incoming ?conversation= param so a re-render doesn't
    // reload the previous conversation.
    router.setParams({ conversation: undefined });
  };

  useEffect(() => {
    if (params.prompt && messages.length === 0 && !params.conversation) {
      send(params.prompt as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to the newest message when the software keyboard finishes
  // showing, so the last bubble is never hidden behind the input.
  // Listener is wrapped in try/catch and cleaned up on unmount to avoid
  // crashes and memory leaks on either platform.
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    try {
      sub = KeyboardEvents.addListener('keyboardDidShow', () => {
        try { scrollRef.current?.scrollToEnd({ animated: true }); } catch {}
      });
    } catch {
      // KeyboardEvents may not be available in some hosts (rare); fail silent.
    }
    return () => {
      try { sub?.remove(); } catch {}
    };
  }, []);

  const suggestions = useMemo(() => assistant.suggestions ?? [], [assistant]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: c.bg, borderBottomColor: c.border }]}>
        <TouchableOpacity testID="chat-back-btn" onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </TouchableOpacity>
        <View style={[styles.assistantIcon, { backgroundColor: assistant.color + '22' }]}>
          <Ionicons name={assistant.icon} size={20} color={assistant.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{assistant.name}</Text>
          <Text style={[styles.tag, { color: c.textMuted }]} numberOfLines={1}>
            {busy ? 'Generating…' : assistant.tagline}
          </Text>
        </View>
        <TouchableOpacity
          testID="chat-new-btn"
          onPress={startNewChat}
          accessibilityLabel="Start a new chat"
          style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}
        >
          <Ionicons name="create-outline" size={20} color={c.text} />
        </TouchableOpacity>
        <TouchableOpacity testID="chat-voice-btn" onPress={() => router.push('/voice')} style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Ionicons name="mic" size={20} color={c.primary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior="translate-with-padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 20 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && !disabled && (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <View style={[styles.introIcon, { backgroundColor: assistant.color + '22' }]}>
                <Ionicons name={assistant.icon} size={32} color={assistant.color} />
              </View>
              <Text style={[styles.introTitle, { color: c.text }]}>{assistant.name}</Text>
              <Text style={[styles.introTag, { color: c.textMuted }]}>{assistant.welcome}</Text>
              {assistant.disclaimer && (
                <View style={[styles.discChip, { backgroundColor: c.warning + '22' }]}>
                  <Ionicons name="alert-circle" size={12} color={c.warning} />
                  <Text style={{ color: c.warning, fontSize: fontSize.xs, marginLeft: 4, fontWeight: '600' }}>{assistant.disclaimer}</Text>
                </View>
              )}
              <View style={{ height: spacing.xl }} />
              {suggestions.map((s, i) => (
                <Pressable
                  key={i}
                  testID={`suggestion-${i}`}
                  onPress={() => send(s)}
                  style={[styles.suggestion, { backgroundColor: c.surface, borderColor: c.border }]}
                >
                  <Ionicons name="sparkles-outline" size={14} color={assistant.color} />
                  <Text style={[styles.suggestionText, { color: c.text }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {disabled && (
            <View style={{ padding: spacing.xl }}>
              <View style={[styles.comingCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Ionicons name="hourglass-outline" size={28} color={c.warning} />
                <Text style={[styles.introTitle, { color: c.text, marginTop: 8 }]}>Coming Soon</Text>
                <Text style={[styles.introTag, { color: c.textMuted, textAlign: 'center' }]}>{assistant.welcome}</Text>
              </View>
            </View>
          )}

          {messages.map(m => {
            const isUser = m.role === 'user';
            const showThinking = m.streaming && !m.content;
            return (
              <View key={m.id} style={[styles.msgRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}>
                <View
                  style={[
                    styles.bubble,
                    isUser
                      ? { backgroundColor: c.primary, borderTopRightRadius: 4 }
                      : {
                          backgroundColor: m.error ? c.error + '15' : c.surface,
                          borderColor: m.error ? c.error : c.border,
                          borderWidth: 1, borderTopLeftRadius: 4,
                        },
                  ]}
                >
                  {showThinking ? (
                    <View style={styles.thinkingRow}>
                      <ActivityIndicator size="small" color={c.primary} />
                      <Text style={{ color: c.textMuted, fontSize: fontSize.md }}>Generating…</Text>
                    </View>
                  ) : (
                    <Text style={[styles.bubbleText, { color: isUser ? '#fff' : c.text }]} selectable>
                      {isUser ? m.content : stripMarkdown(m.content)}
                      {m.streaming && <BlinkingCursor color={c.primary} />}
                    </Text>
                  )}
                  {m.citations && m.citations.length > 0 && (
                    <View style={styles.citations}>
                      <Text style={[styles.citTitle, { color: c.textMuted }]}>Sources</Text>
                      {m.citations.slice(0, 5).map((cit, i) => (
                        <Text key={i} style={[styles.citText, { color: c.secondary }]} numberOfLines={1}>
                          [{i + 1}] {cit.title || cit.url}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: c.surface, borderColor: c.border, marginBottom: insets.bottom + 76 }]}>
          <TouchableOpacity
            testID="chat-toggle-search"
            onPress={() => setUseSearch(s => !s)}
            style={[styles.toolBtn, { backgroundColor: useSearch ? c.primary + '22' : 'transparent' }]}
          >
            <Ionicons name={useSearch ? 'globe' : 'globe-outline'} size={20} color={useSearch ? c.primary : c.textMuted} />
          </TouchableOpacity>
          <TextInput
            testID="chat-input"
            placeholder={disabled ? 'Not available' : assistant.placeholder}
            placeholderTextColor={c.textDim}
            value={text}
            onChangeText={setText}
            style={[styles.textInput, { color: c.text }]}
            editable={!disabled}
            multiline
          />
          {busy ? (
            <TouchableOpacity testID="chat-stop-btn" onPress={stopGeneration} style={[styles.sendBtn, { backgroundColor: c.error }]}>
              <Ionicons name="stop" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="chat-send-btn"
              onPress={() => send()}
              disabled={!text.trim() || disabled}
              style={[styles.sendBtn, { backgroundColor: text.trim() ? c.primary : c.surface2 }]}
            >
              <Ionicons name="arrow-up" size={18} color={text.trim() ? '#fff' : c.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    gap: 10, borderBottomWidth: 1,
  },
  iconBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  assistantIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.lg, fontWeight: '700' },
  tag: { fontSize: fontSize.xs },
  introIcon: { width: 76, height: 76, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  introTitle: { fontSize: fontSize.xxl, fontWeight: '800' },
  introTag: { fontSize: fontSize.md, marginTop: 6, textAlign: 'center', paddingHorizontal: spacing.lg, lineHeight: 22 },
  discChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, marginTop: spacing.md },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.pill, borderWidth: 1, marginTop: spacing.md, alignSelf: 'stretch',
  },
  suggestionText: { fontSize: fontSize.md, fontWeight: '600', flex: 1 },
  comingCard: { alignItems: 'center', padding: spacing.xl, borderRadius: radius.xxl, borderWidth: 1 },
  msgRow: { flexDirection: 'row', marginBottom: spacing.md },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.xxl,
  },
  bubbleText: { fontSize: fontSize.md, lineHeight: 22 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  citations: { marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#94a3b855' },
  citTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  citText: { fontSize: fontSize.xs, marginBottom: 2 },
  inputBar: {
    marginHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.xxl,
    borderWidth: 1,
  },
  toolBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  textInput: { flex: 1, fontSize: fontSize.md, minHeight: 40, maxHeight: 120, paddingHorizontal: 6, paddingVertical: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
