import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typo, layout } from '../constants/theme';

// Catch-all for unmatched deep links (e.g., taste-roulette://spotify-error)
// Redirects to a safe screen instead of showing a broken page.
export default function NotFoundScreen() {
  const pathname = usePathname();

  useEffect(() => {
    // Auto-redirect known deep link patterns to appropriate screens
    if (pathname.includes('spotify-error') || pathname.includes('spotify-connected')) {
      router.replace('/onboarding');
      return;
    }
    if (pathname.includes('invite') || pathname.includes('share')) {
      router.replace('/');
      return;
    }
  }, [pathname]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🎵</Text>
        <Text style={styles.title}>Page not found</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/')} accessibilityLabel="Go to home screen">
          <Text style={styles.buttonText}>Go home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { ...layout.screen },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emoji: { fontSize: 48, marginBottom: spacing.lg },
  title: { ...typo.title, marginBottom: spacing.xxl, textAlign: 'center' },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: 28,
  },
  buttonText: { ...typo.subheading, fontWeight: '700' },
});
