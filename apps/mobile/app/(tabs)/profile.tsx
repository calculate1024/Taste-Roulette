import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { supabase, getAuthHeaders } from '../../services/supabase';
import { getProfile, type ProfileStats } from '../../services/api';

const SPOTIFY_GREEN = '#1DB954';
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function ProfileScreen() {
  const session = useAppStore((s) => s.session);
  const resetOnboarding = useAppStore((s) => s.resetOnboarding);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyName, setSpotifyName] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const userId = session?.user?.id;

  // Refresh Spotify connection status when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      fetchSpotifyStatus();
    }, [userId])
  );

  useEffect(() => {
    if (!userId) return;
    getProfile(userId)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [userId]);

  const fetchSpotifyStatus = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('spotify_connected, spotify_display_name')
      .eq('id', userId)
      .single();

    if (data) {
      setSpotifyConnected(data.spotify_connected ?? false);
      setSpotifyName(data.spotify_display_name ?? null);
    }
  };

  const handleConnectSpotify = () => {
    router.push('/spotify-connect');
  };

  const handleDisconnectSpotify = () => {
    Alert.alert(
      '取消連結 Spotify',
      '確定要取消連結 Spotify 帳號嗎？你的品味向量將僅基於 Onboarding 資料重新計算。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定',
          style: 'destructive',
          onPress: async () => {
            setDisconnecting(true);
            try {
              const headers = await getAuthHeaders();
              await fetch(`${API_BASE}/api/spotify/disconnect`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ user_id: userId }),
              });
              setSpotifyConnected(false);
              setSpotifyName(null);
            } catch (err) {
              console.error('Failed to disconnect Spotify:', err);
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    resetOnboarding();
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>個人檔案</Text>
        <Text style={styles.subtitle}>你的品味旅程從這裡開始</Text>

        {loading ? (
          <ActivityIndicator
            size="small"
            color="#6C5CE7"
            style={styles.loader}
          />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats?.totalCards ?? 0}</Text>
              <Text style={styles.statLabel}>收到卡片</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats?.surprisedCount ?? 0}</Text>
              <Text style={styles.statLabel}>驚喜次數</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats?.streakCount ?? 0}</Text>
              <Text style={styles.statLabel}>連續天數</Text>
            </View>
          </View>
        )}

        {/* Impact section — only show if user has made recommendations */}
        {stats && stats.impactSurprised > 0 && (
          <View style={styles.impactSection}>
            <Text style={styles.impactTitle}>你的推薦影響力</Text>
            <View style={styles.impactRow}>
              <Text style={styles.impactEmoji}>🎉</Text>
              <View>
                <Text style={styles.impactNumber}>{stats.impactSurprised}</Text>
                <Text style={styles.impactLabel}>讓人驚喜</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.email}>{session?.user?.email}</Text>

        {/* Spotify connection section */}
        <View style={styles.spotifySection}>
          {spotifyConnected ? (
            <View style={styles.spotifyConnectedRow}>
              <View style={styles.spotifyConnectedInfo}>
                <View style={styles.spotifyDot} />
                <View>
                  <Text style={styles.spotifyConnectedText}>
                    Spotify 已連結
                  </Text>
                  {spotifyName && (
                    <Text style={styles.spotifyNameText}>{spotifyName}</Text>
                  )}
                </View>
              </View>
              <Pressable
                style={styles.disconnectButton}
                onPress={handleDisconnectSpotify}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <ActivityIndicator color="#E74C3C" size="small" />
                ) : (
                  <Text style={styles.disconnectText}>取消連結</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.spotifyConnectButton}
              onPress={handleConnectSpotify}
            >
              <Text style={styles.spotifyConnectText}>連結 Spotify 帳號</Text>
            </Pressable>
          )}
        </View>

        <Pressable style={styles.resetButton} onPress={resetOnboarding}>
          <Text style={styles.resetText}>重置 Onboarding (Dev)</Text>
        </Pressable>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>登出</Text>
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
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 32,
  },
  loader: {
    marginBottom: 48,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 48,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  // Impact section
  impactSection: {
    backgroundColor: 'rgba(108,92,231,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.2)',
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  impactNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  impactLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  email: {
    fontSize: 14,
    color: '#6C5CE7',
    marginBottom: 24,
  },
  spotifySection: {
    marginBottom: 32,
  },
  spotifyConnectButton: {
    backgroundColor: SPOTIFY_GREEN,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
  },
  spotifyConnectText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  spotifyConnectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
  },
  spotifyConnectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  spotifyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SPOTIFY_GREEN,
    marginRight: 12,
  },
  spotifyConnectedText: {
    color: SPOTIFY_GREEN,
    fontSize: 14,
    fontWeight: '600',
  },
  spotifyNameText: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  disconnectButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  disconnectText: {
    color: '#E74C3C',
    fontSize: 13,
  },
  resetButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 16,
  },
  resetText: {
    color: '#666',
    fontSize: 14,
  },
  signOutButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  signOutText: {
    color: '#E74C3C',
    fontSize: 14,
  },
});
