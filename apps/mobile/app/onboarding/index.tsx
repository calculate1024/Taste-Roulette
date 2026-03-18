import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { getAuthHeaders } from '../../services/supabase';

const SPOTIFY_GREEN = '#1DB954';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function OnboardingGatewayScreen() {
  const session = useAppStore((s) => s.session);
  const setSpotifyOnboarding = useAppStore((s) => s.setSpotifyOnboarding);
  const userId = session?.user?.id;
  const [loading, setLoading] = useState(false);

  // Handle deep link return from Spotify OAuth
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      if (event.url.includes('spotify-connected')) {
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
      } else if (event.url.includes('spotify-error')) {
        setLoading(false);
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
    router.push('/onboarding/recognize');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.spotifyIcon}>
            <Text style={styles.spotifyIconText}>S</Text>
          </View>
        </View>

        <Text style={styles.title}>Let's get to know you</Text>
        <Text style={styles.subtitle}>
          Connect Spotify to use your own music for taste profiling, or continue without it.
        </Text>

        <Text style={styles.description}>
          {'\u9023\u7d50 Spotify \u5F8C\uFF0C\u6211\u5011\u7528\u4F60\u807D\u904E\u7684\u97F3\u6A02\u4F86\u4E86\u89E3\u4F60\u7684\u54C1\u5473'}
        </Text>

        {/* Spotify connect button */}
        <Pressable
          style={[styles.spotifyButton, loading && styles.buttonDisabled]}
          onPress={handleConnectSpotify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.spotifyButtonText}>
              {'\u9023\u7D50 Spotify\uFF0C\u7528\u4F60\u7684\u97F3\u6A02\u958B\u59CB'}
            </Text>
          )}
        </Pressable>

        {/* Skip link */}
        <Pressable style={styles.skipButton} onPress={handleSkipSpotify}>
          <Text style={styles.skipButtonText}>
            {'\u4E0D\u4F7F\u7528 Spotify \u7E7C\u7E8C'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  spotifyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: SPOTIFY_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spotifyIconText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  spotifyButton: {
    backgroundColor: SPOTIFY_GREEN,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  spotifyButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 15,
    color: '#8E8E93',
  },
});
