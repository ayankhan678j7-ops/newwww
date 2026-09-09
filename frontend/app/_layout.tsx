import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { AuthProvider } from '@/src/context/AuthContext';

LogBox.ignoreAllLogs(true);

// Preserve icon-font prewarming so Expo Go on Android doesn't crash.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    // The native splash (app icon) is kept up until the entry gate (app/index.tsx)
    // resolves auth and redirects — this avoids any blank/loading flicker.
    // Safety net: never let the splash stay stuck if the gate can't run (e.g. a
    // direct deep-link cold start to a non-index route).
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 6000);
    return () => clearTimeout(t);
  }, []);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider>
            <AuthProvider>
              <StatusBar barStyle="light-content" />
              <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="chat" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="voice" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
                <Stack.Screen name="history" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="privacy" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="terms" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="rate" options={{ animation: 'slide_from_right' }} />
              </Stack>
            </AuthProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
