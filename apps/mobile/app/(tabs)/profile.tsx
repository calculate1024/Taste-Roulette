import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { supabase, getAuthHeaders } from '../../services/supabase';
import { getProfile, type ProfileStats } from '../../services/api';
import CountingNumber from '../../components/CountingNumber';
import { colors, spacing, radius, typo, layout, shadow } from '../../constants/theme';

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

  const statItems = [
    { label: '收到卡片', value: stats?.totalCards ?? 0 },
    { label: '驚喜次數', value: stats?.surprisedCount ?? 0 },
    { label: '連續天數', value: stats?.streakCount ?? 0 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        <Text style={styles.title}>個人檔案</Text>
        <Text style={styles.subtitle}>你的品味旅程從這裡開始</Text>

        {loading ? (
          <ActivityIndicator
            size="small"
            color={colors.accent}
            style={styles.loader}
          />
        ) : (
          <View style={styles.statsRow}>
            {statItems.map((item, index) => (
              <Animated.View
                key={item.label}
                entering={FadeIn.delay(index * 100).duration(400)}
                style={styles.statBox}
              >
                <CountingNumber value={item.value} style={styles.statNumber} />
                <Text style={styles.statLabel}>{item.label}</Text>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Impact section — only show if user has made recommendations */}
        {stats && stats.impactSurprised > 0 && (
          <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.impactSection}>
            <Text style={styles.impactTitle}>你的推薦影響力</Text>
            <View style={styles.impactRow}>
              <Text style={styles.impactEmoji}>🎉</Text>
              <View>
                <CountingNumber value={stats.impactSurprised} style={styles.impactNumber} />
                <Text style={styles.impactLabel}>讓人驚喜</Text>
              </View>
            </View>
          </Animated.View>
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
                  <ActivityIndicator color={colors.error} size="small" />
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  title: {
    ...typo.title,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typo.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  loader: {
    marginBottom: spacing.xxxl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxxl,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    marginHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  // Impact section
  impactSection: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.2)',
    ...shadow.soft,
  },
  impactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactEmoji: {
    fontSize: 32,
    marginRight: spacing.lg,
  },
  impactNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
  },
  impactLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  email: {
    fontSize: 14,
    color: colors.accent,
    marginBottom: spacing.xl,
  },
  spotifySection: {
    marginBottom: spacing.xxl,
  },
  spotifyConnectButton: {
    backgroundColor: colors.spotify,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: spacing.xl,
    alignItems: 'center',
  },
  spotifyConnectText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  spotifyConnectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.spotifyDim,
    borderRadius: radius.md,
    padding: spacing.lg,
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
    backgroundColor: colors.spotify,
    marginRight: spacing.md,
  },
  spotifyConnectedText: {
    color: colors.spotify,
    fontSize: 14,
    fontWeight: '600',
  },
  spotifyNameText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  disconnectButton: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  disconnectText: {
    color: colors.error,
    fontSize: 13,
  },
  resetButton: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  resetText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  signOutButton: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  signOutText: {
    color: colors.error,
    fontSize: 14,
  },
});
