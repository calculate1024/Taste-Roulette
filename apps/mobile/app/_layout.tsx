import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import { PostHogProvider } from 'posthog-react-native';
import { supabase } from '../services/supabase';
import { useAppStore } from '../store/appStore';
import { useNotifications } from '../hooks/useNotifications';
import '../i18n';

// Initialize Sentry
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,
    enabled: !__DEV__,
  });
}

// PostHog config
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export default function RootLayout() {
  const setSession = useAppStore((s) => s.setSession);
  const setAuthReady = useAppStore((s) => s.setAuthReady);
  const loadPersistedState = useAppStore((s) => s.loadPersistedState);
  const [ready, setReady] = useState(false);

  // Register push notifications after auth
  useNotifications();

  useEffect(() => {
    // Load persisted onboarding state
    loadPersistedState().then(() => setReady(true));

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!useAppStore.getState().isAuthReady) {
          setAuthReady(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setSession, setAuthReady, loadPersistedState]);

  if (!ready) return null;

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="recommend"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="spotify-connect"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="twins"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );

  if (POSTHOG_API_KEY) {
    return (
      <PostHogProvider
        apiKey={POSTHOG_API_KEY}
        options={{ host: POSTHOG_HOST }}
      >
        {content}
      </PostHogProvider>
    );
  }

  return content;
}
