import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

/**
 * Entry gate. The NATIVE splash (app icon) stays visible until auth state is
 * resolved, then we redirect straight to Home (signed-in) or the Sign In / Sign
 * Up screen (not signed-in). No JS loading screen, no auth flicker.
 * The login session is persisted (token in storage), so returning users always
 * land directly on Home.
 */
export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Auth resolved — hide the native splash right before we redirect.
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  // While auth is resolving, render nothing — the native splash covers the screen.
  if (loading) return null;

  return <Redirect href={user ? '/(tabs)' : '/auth'} />;
}
