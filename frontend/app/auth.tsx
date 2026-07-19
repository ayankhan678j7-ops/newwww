import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { AIOrb } from '@/src/components/AIOrb';
import { fontSize, radius, spacing } from '@/src/theme/colors';
import { startGoogleLogin } from '@/src/api/googleAuth';

type Mode = 'signin' | 'signup';

export default function AuthScreen() {
  const { signInGuest, signInWithEmail, signUpWithEmail, signInGoogle } = useAuth();
  const { c } = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailOk && password.length >= 6 && (mode === 'signin' || name.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      if (mode === 'signup') await signUpWithEmail(name.trim(), email.trim(), password);
      else await signInWithEmail(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(mode === 'signup' ? 'Sign-up failed' : 'Sign-in failed', e.message ?? 'Unknown error');
    } finally { setBusy(false); }
  };

  const handleGuest = async () => {
    setBusy(true);
    try {
      await signInGuest();
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message ?? 'Unknown error');
    } finally { setBusy(false); }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const profile = await startGoogleLogin();
      // On web, startGoogleLogin triggers a full-page redirect and never
      // resolves — we handle the return in the mount effect above.
      if (!profile) {
        if (Platform.OS !== 'web') setBusy(false);
        return;
      }
      await signInGoogle(profile.name || profile.email.split('@')[0], profile.email);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Google sign-in failed', e?.message ?? 'Unknown error');
    } finally {
      if (Platform.OS !== 'web') setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top','bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.orbWrap}>
            <AIOrb size={110} />
          </View>
          <Text style={[styles.title, { color: c.text }]} testID="auth-title">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>
            {mode === 'signin' ? 'Sign in to your JARVIS AI' : 'Join JARVIS AI — 42 expert assistants'}
          </Text>

          <View style={{ height: spacing.xl }} />

          {/* Mode toggle */}
          <View style={[styles.segment, { backgroundColor: c.surface, borderColor: c.border }]}>
            <TouchableOpacity
              testID="auth-mode-signin"
              onPress={() => setMode('signin')}
              style={[styles.segmentBtn, mode === 'signin' && { backgroundColor: c.primary }]}
            >
              <Text style={[styles.segmentText, { color: mode === 'signin' ? '#fff' : c.textMuted }]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="auth-mode-signup"
              onPress={() => setMode('signup')}
              style={[styles.segmentBtn, mode === 'signup' && { backgroundColor: c.primary }]}
            >
              <Text style={[styles.segmentText, { color: mode === 'signup' ? '#fff' : c.textMuted }]}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {mode === 'signup' && (
            <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="person-outline" size={18} color={c.textMuted} />
              <TextInput
                testID="auth-name-input"
                placeholder="Your name"
                placeholderTextColor={c.textDim}
                value={name}
                onChangeText={setName}
                style={[styles.input, { color: c.text }]}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          )}

          <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="mail-outline" size={18} color={c.textMuted} />
            <TextInput
              testID="auth-email-input"
              placeholder="Email"
              placeholderTextColor={c.textDim}
              value={email}
              onChangeText={setEmail}
              style={[styles.input, { color: c.text }]}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              autoComplete="email"
            />
          </View>

          <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={c.textMuted} />
            <TextInput
              testID="auth-password-input"
              placeholder="Password (min 6 chars)"
              placeholderTextColor={c.textDim}
              value={password}
              onChangeText={setPassword}
              style={[styles.input, { color: c.text }]}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={submit}
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPass(s => !s)} testID="auth-toggle-pass">
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="auth-submit-btn"
            onPress={submit}
            disabled={!canSubmit || busy}
            style={[styles.primaryBtn, { backgroundColor: canSubmit ? c.primary : c.surface2, opacity: busy ? 0.7 : 1 }]}
          >
            {busy ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.primaryBtnText}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.textDim }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>

          <TouchableOpacity
            testID="auth-google-btn"
            onPress={handleGoogle}
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Ionicons name="logo-google" size={18} color={c.text} />
            <Text style={[styles.secondaryBtnText, { color: c.text }]}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="auth-guest-btn"
            onPress={handleGuest}
            style={[styles.secondaryBtn, { backgroundColor: 'transparent', borderColor: c.border }]}
          >
            <Ionicons name="flash-outline" size={18} color={c.text} />
            <Text style={[styles.secondaryBtnText, { color: c.text }]}>Continue as Guest</Text>
          </TouchableOpacity>

          <View style={styles.footerLinks}>
            <TouchableOpacity testID="auth-privacy-link" onPress={() => router.push('/privacy')}>
              <Text style={[styles.linkText, { color: c.textMuted }]}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={{ color: c.textDim, marginHorizontal: 8 }}>·</Text>
            <TouchableOpacity testID="auth-terms-link" onPress={() => router.push('/terms')}>
              <Text style={[styles.linkText, { color: c.textMuted }]}>Terms</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.footer, { color: c.textDim }]}>
            By continuing you accept our Privacy Policy and Terms. Health, Finance and Legal are for information only, not professional advice.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    alignItems: 'stretch',
  },
  orbWrap: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: { marginTop: 4, fontSize: fontSize.md, textAlign: 'center' },
  segment: {
    flexDirection: 'row', padding: 4, borderRadius: radius.pill, borderWidth: 1, marginBottom: spacing.lg, alignSelf: 'stretch',
  },
  segmentBtn: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontWeight: '700', fontSize: fontSize.sm, letterSpacing: 0.3 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: spacing.lg, height: 54,
    borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md,
  },
  input: { flex: 1, fontSize: fontSize.md },
  primaryBtn: {
    marginTop: 4, height: 54, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: fontSize.md, letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: 12, fontSize: fontSize.xs, letterSpacing: 2, fontWeight: '700' },
  secondaryBtn: {
    height: 54, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
    borderWidth: 1, marginBottom: spacing.sm,
  },
  secondaryBtnText: { fontWeight: '700', fontSize: fontSize.md },
  footerLinks: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg,
  },
  linkText: { fontSize: fontSize.sm, fontWeight: '600' },
  footer: {
    marginTop: spacing.md, fontSize: fontSize.xs, textAlign: 'center', lineHeight: 16,
  },
});
