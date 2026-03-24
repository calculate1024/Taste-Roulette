import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';
import { getAuthHeaders } from '../../services/supabase';
import { colors, spacing, radius, typo, layout } from '../../constants/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function OnboardingGatewayScreen() {
  const { t } = useTranslation();
  const session = useAppStore((s) => s.session);
  const setSpotifyOnboarding = useAppStore((s) => s.setSpotifyOnboarding);
  const userId = session?.user?.id;
  const [loading, setLoading] = useState(false);

  // Handle deep link return from Spotify OAuth
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      if (event.url.includes('spotify=connected')) {
        // Spotify connected — trigger import then go to swipe with spotify source
        try {
          const headers = await getAuthHeaders();
          await fetch(`${API_URL}/api/spotify/import`, {
            method: 'POST',
            headers,
          });
        } catch (err) {
          // Import is best-effort; don't block navigation
          console.warn('Spotify import failed:', err);
        }
        setSpotifyOnboarding(true);
        setLoading(false);
        router.push('/onboarding/swipe?source=spotify');
      } else if (event.url.includes('spotify=error')) {
        setLoading(false);
        Alert.alert(
          t('common.error'),
          t('onboarding.spotifyAuthFailed'),
        );
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, [setSpotifyOnboarding]);

  const handleConnectSpotify = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_URL}/api/spotify/auth-url?user_id=${userId}`,
        { headers }
      );
      const data = await res.json();

      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch (err) {
      console.error('Failed to get Spotify auth URL:', err);
      setLoading(false);
    }
  };

  const handleSkipSpotify = () => {
    setSpotifyOnboarding(false);
    router.push('/onboarding/genres');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.spotifyIcon}>
            <Text style={styles.spotifyIconText}>S</Text>
          </View>
        </View>

        <Text style={styles.title}>{t('onboarding.letsGetToKnowYou')}</Text>
        <Text style={styles.subtitle}>
          {t('onboarding.connectSpotifySubtitle')}
        </Text>

        <Text style={styles.description}>
          {t('onboarding.connectSpotifyDescription')}
        </Text>

        {/* Primary: Skip Spotify and start */}
        <Pressable style={styles.primaryButton} onPress={handleSkipSpotify}>
          <Text style={styles.primaryButtonText}>
            {t('onboarding.startOnboarding')}
          </Text>
        </Pressable>

        {/* Secondary: Spotify connect (optional, de-emphasized) */}
        <Pressable
          style={[styles.spotifyLink, loading && styles.buttonDisabled]}
          onPress={handleConnectSpotify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textSecondary} size="small" />
          ) : (
            <Text style={styles.spotifyLinkText}>
              {t('onboarding.connectSpotifyStart')}
            </Text>
          )}
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.screen,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.xxl,
  },
  spotifyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.spotify,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotifyIconText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  title: {
    ...typo.title,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typo.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  primaryButtonText: {
    ...typo.subheading,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  spotifyLink: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  spotifyLinkText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
