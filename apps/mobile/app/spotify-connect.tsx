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
import { useAppStore } from '../store/appStore';
import { getAuthHeaders } from '../services/supabase';

const SPOTIFY_GREEN = '#1DB954';
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function SpotifyConnectScreen() {
  const session = useAppStore((s) => s.session);
  const userId = session?.user?.id;
  const [loading, setLoading] = useState(false);

  // Handle deep link return from Spotify OAuth
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      if (event.url.includes('spotify-connected')) {
        router.replace('/(tabs)/profile');
      } else if (event.url.includes('spotify-error')) {
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

        <Text style={styles.title}>連結 Spotify</Text>
        <Text style={styles.subtitle}>
          連結你的 Spotify 帳號，我們可以更了解你的品味
        </Text>

        {/* Benefits list */}
        <View style={styles.benefitsList}>
          <BenefitItem text="更精準的品味分析" />
          <BenefitItem text="更好的推薦配對" />
          <BenefitItem text="更豐富的品味輪廓" />
          <BenefitItem text="追蹤你的聆聽偏好變化" />
        </View>

        {/* Privacy note */}
        <Text style={styles.privacyNote}>
          我們只會讀取你的聆聽紀錄，不會修改你的 Spotify 帳號內容。
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
            <Text style={styles.connectButtonText}>連結 Spotify 帳號</Text>
          )}
        </Pressable>

        {/* Skip button */}
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>稍後再說</Text>
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
