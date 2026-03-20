import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useAppStore } from '../store/appStore';
import { getAuthHeaders } from '../services/supabase';

const SPOTIFY_GREEN = '#1DB954';
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function SpotifyConnectScreen() {
  const { t } = useTranslation();
  const session = useAppStore((s) => s.session);
  const userId = session?.user?.id;
  const [loading, setLoading] = useState(false);

  // Handle deep link return from Spotify OAuth
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      if (event.url.includes('spotify=connected')) {
        // Trigger Spotify data import to enrich taste vector
        try {
          const headers = await getAuthHeaders();
          await fetch(`${API_BASE}/api/spotify/import`, {
            method: 'POST',
            headers,
          });
        } catch (err) {
          // Import is best-effort; don't block navigation
          console.warn('Spotify import failed:', err);
        }
        router.replace('/(tabs)/profile');
      } else if (event.url.includes('spotify=error')) {
        setLoading(false);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const handleConnect = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${API_BASE}/api/spotify/auth-url?user_id=${userId}`,
        { headers }
      );
      const data = await res.json();

      if (data.url) {
        // Open Spotify auth page in system browser
        await Linking.openURL(data.url);
      }
    } catch (err) {
      console.error('Failed to get Spotify auth URL:', err);
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Spotify logo area */}
        <View style={styles.iconContainer}>
          <View style={styles.spotifyIcon}>
            <Text style={styles.spotifyIconText}>S</Text>
          </View>
        </View>

        <Text style={styles.title}>{t('spotifyConnect.connectSpotify')}</Text>
        <Text style={styles.subtitle}>
          {t('spotifyConnect.connectSubtitle')}
        </Text>

        {/* Benefits list */}
        <View style={styles.benefitsList}>
          <BenefitItem text={t('spotifyConnect.accurateAnalysis')} />
          <BenefitItem text={t('spotifyConnect.betterMatching')} />
          <BenefitItem text={t('spotifyConnect.richerProfile')} />
          <BenefitItem text={t('spotifyConnect.trackPreferences')} />
        </View>

        {/* Privacy note */}
        <Text style={styles.privacyNote}>
          {t('spotifyConnect.privacyNote')}
        </Text>

        {/* Connect button */}
        <Pressable
          style={[styles.connectButton, loading && styles.connectButtonDisabled]}
          onPress={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.connectButtonText}>{t('spotifyConnect.connectAccount')}</Text>
          )}
        </Pressable>

        {/* Skip button */}
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>{t('spotifyConnect.maybeLater')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Text style={styles.checkmark}>✓</Text>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
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
    paddingTop: 48,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  benefitsList: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  checkmark: {
    fontSize: 18,
    color: SPOTIFY_GREEN,
    marginRight: 12,
    fontWeight: '600',
  },
  benefitText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  privacyNote: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  connectButton: {
    backgroundColor: SPOTIFY_GREEN,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 16,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectButtonText: {
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
