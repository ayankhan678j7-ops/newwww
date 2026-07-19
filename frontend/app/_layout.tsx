import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import { ThemeProvider } from '@/src/context/ThemeContext';
import { AuthProvider } from '@/src/context/AuthContext';

LogBox.ignoreAllLogs(true);

// Preserve icon-font prewarming so Expo Go on Android doesn't crash.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
