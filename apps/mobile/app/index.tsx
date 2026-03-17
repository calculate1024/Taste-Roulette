import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppStore } from '../store/appStore';

export default function Index() {
  const session = useAppStore((s) => s.session);
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);
  const isAuthReady = useAppStore((s) => s.isAuthReady);

  useEffect(() => {
    if (!isAuthReady) return; // Don't navigate until auth is resolved

    if (!session) {
      router.replace('/login');
    } else if (!onboardingCompleted) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)/home');
    }
  }, [session, onboardingCompleted, isAuthReady]);

  if (!isAuthReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F1A',
  },
});
