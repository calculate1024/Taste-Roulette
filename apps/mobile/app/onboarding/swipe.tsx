import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
} from 'react-native-reanimated';
import { useAppStore } from '../../store/appStore';
import { supabase } from '../../services/supabase';
import { getAuthHeaders } from '../../services/supabase';
import { ONBOARDING_TRACKS, OnboardingTrack } from '../../constants/mockTracks';
import { colors, spacing, radius, typo, layout, shadow } from '../../constants/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const MIN_CARDS_BEFORE_EARLY_EXIT = 5;
const CONSECUTIVE_SAME_FOR_EXIT = 3;

type Reaction = 'love' | 'okay' | 'not_for_me';

interface TrackItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  genres: string[];
  spotifyUrl: string;
}

export default function OnboardingSwipeScreen() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showEarlyExit, setShowEarlyExit] = useState(false);
  const [loading, setLoading] = useState(false);
  const reactions = useRef<Reaction[]>([]);
  const addResponse = useAppStore((s) => s.addResponse);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const session = useAppStore((s) => s.session);
  const recognizedTracks = useAppStore((s) => s.recognizedTracks);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Fetch tracks based on source
  useEffect(() => {
    async function loadTracks() {
      setFetchLoading(true);
      setFetchError(null);

      try {
        if (source === 'spotify') {
          // Fetch user's personal Spotify top tracks
          const headers = await getAuthHeaders();
          const res = await fetch(`${API_URL}/api/onboarding/personal-tracks`, { headers });
          if (!res.ok) {
            throw new Error('Failed to fetch personal tracks');
          }
          const data = await res.json();
          const mapped: TrackItem[] = (data.tracks || []).map((t: any) => ({
            id: t.spotify_id,
            title: t.title,
            artist: t.artist,
            album: t.album || '',
            coverUrl: t.cover_url || '',
            genres: t.genres || [],
            spotifyUrl: t.spotify_url || '',
          }));
          if (mapped.length === 0) {
            throw new Error('No tracks found');
          }
          setTracks(mapped);
        } else if (source === 'recognize') {
          // Filter ONBOARDING_TRACKS or fetch from API, using only recognized IDs
          if (recognizedTracks.length > 0) {
            // Fetch full track data from API for recognized tracks
            const headers = await getAuthHeaders();
            const res = await fetch(`${API_URL}/api/onboarding/tracks`, { headers });
            if (res.ok) {
              const data = await res.json();
              const allTracks: TrackItem[] = (data.tracks || []).map((t: any) => ({
                id: t.spotify_id,
                title: t.title,
                artist: t.artist,
                album: t.album || '',
                coverUrl: t.cover_url || '',
                genres: t.genres || [],
                spotifyUrl: t.spotify_url || '',
              }));
              // Filter to only recognized tracks
              const recognized = allTracks.filter((t) => recognizedTracks.includes(t.id));
              if (recognized.length > 0) {
                setTracks(recognized);
              } else {
                // Fallback to mock tracks that match recognized IDs
                const fallback = ONBOARDING_TRACKS.filter((t) => recognizedTracks.includes(t.id));
                setTracks(fallback.length > 0 ? fallback : ONBOARDING_TRACKS);
              }
            } else {
              // Fallback to local mock tracks filtered by recognized IDs
              const fallback = ONBOARDING_TRACKS.filter((t) => recognizedTracks.includes(t.id));
              setTracks(fallback.length > 0 ? fallback : ONBOARDING_TRACKS);
            }
          } else {
            // No recognized tracks — fallback to all mock tracks
            setTracks(ONBOARDING_TRACKS);
          }
        } else {
          // Default fallback — use hardcoded tracks
          setTracks(ONBOARDING_TRACKS);
        }
      } catch (err: any) {
        console.error('Failed to load onboarding tracks:', err);
        setFetchError(err.message || 'Failed to load tracks');
        // Fallback to mock tracks so user can still proceed
        setTracks(ONBOARDING_TRACKS);
      } finally {
        setFetchLoading(false);
      }
    }

    loadTracks();
  }, [source, recognizedTracks]);

  const track = tracks[currentIndex];
  const isLastCard = currentIndex >= tracks.length - 1;
  const totalCards = tracks.length;
  const progress = totalCards > 0
    ? ((currentIndex + (showEarlyExit ? 1 : 0)) / totalCards) * 100
    : 0;

  const finishOnboarding = useCallback(async () => {
    try {
      setLoading(true);
      const userId = session?.user?.id;
      if (!userId) {
        // No auth — just complete locally (dev/mock mode)
        completeOnboarding();
        router.replace('/(tabs)/home');
        return;
      }

      // 1. Send responses to DB
      const responses = useAppStore.getState().onboardingResponses;
      const responseRows = responses.map((r) => ({
        user_id: userId,
        track_id: r.trackId,
        reaction: r.reaction,
      }));

      const { error: insertError } = await supabase
        .from('onboarding_responses')
        .insert(responseRows);

      if (insertError) throw insertError;

      // 2. Call complete endpoint (computes taste vector + first card)
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/api/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession?.access_token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to complete onboarding');

      // 3. Update local state
      completeOnboarding();
      router.replace('/(tabs)/home');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [completeOnboarding, session]);

  // Check if last N reactions are all the same
  const shouldOfferEarlyExit = useCallback((reactionList: Reaction[]): boolean => {
    if (reactionList.length < MIN_CARDS_BEFORE_EARLY_EXIT) return false;
    const last = reactionList.slice(-CONSECUTIVE_SAME_FOR_EXIT);
    return last.every((r) => r === last[0]);
  }, []);

  const handleReaction = useCallback(
    (reaction: Reaction) => {
      if (!track) return;
      addResponse(track.id, reaction);
      reactions.current.push(reaction);

      if (isLastCard) {
        finishOnboarding();
      } else if (shouldOfferEarlyExit(reactions.current)) {
        setShowEarlyExit(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [track, isLastCard, addResponse, finishOnboarding, shouldOfferEarlyExit]
  );

  const resetCard = useCallback(() => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    rotation.value = withSpring(0);
    opacity.value = withTiming(1);
  }, [translateX, translateY, rotation, opacity]);

  const animateOut = useCallback(
    (reaction: Reaction) => {
      const direction = reaction === 'love' ? 1 : reaction === 'not_for_me' ? -1 : 0;
      const targetX = direction * SCREEN_WIDTH * 1.5;
      const targetY = reaction === 'okay' ? -SCREEN_WIDTH : 0;

      translateX.value = withTiming(targetX, { duration: 300 });
      translateY.value = withTiming(targetY, { duration: 300 });
      opacity.value = withTiming(0, { duration: 250 }, () => {
        runOnJS(handleReaction)(reaction);
        translateX.value = 0;
        translateY.value = 0;
        rotation.value = 0;
        opacity.value = 1;
      });
    },
    [translateX, translateY, rotation, opacity, handleReaction]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotation.value = (event.translationX / SCREEN_WIDTH) * 15;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        runOnJS(animateOut)('love');
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        runOnJS(animateOut)('not_for_me');
      } else if (event.translationY < -SWIPE_THRESHOLD) {
        runOnJS(animateOut)('okay');
      } else {
        runOnJS(resetCard)();
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  // Loading state while fetching tracks
  if (fetchLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>
            {source === 'spotify' ? 'Loading your music...' : 'Preparing tracks...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!track) {
    return null;
  }

  // Early exit prompt
  if (showEarlyExit) {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.earlyExitContainer}>
          <Text style={styles.earlyExitEmoji}>🎯</Text>
          <Text style={styles.earlyExitTitle}>We've got your vibe!</Text>
          <Text style={styles.earlyExitSubtitle}>
            Looks like your taste is clear. Ready to start discovering?
          </Text>
          <Pressable style={styles.earlyExitButton} onPress={finishOnboarding} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} size="small" />
            ) : (
              <Text style={styles.earlyExitButtonText}>Let's go!</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.earlyExitContinue}
            onPress={() => {
              setShowEarlyExit(false);
              setCurrentIndex((i) => i + 1);
            }}
          >
            <Text style={styles.earlyExitContinueText}>
              Keep swiping ({totalCards - currentIndex - 1} left)
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>What's your vibe?</Text>
          <Text style={styles.headerSubtitle}>
            {currentIndex + 1} / {totalCards}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* Source indicator */}
        {fetchError && (
          <Text style={styles.fallbackNotice}>
            Could not load {source} tracks. Using default selection.
          </Text>
        )}

        {/* Card */}
        <View style={styles.cardContainer}>
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.card, { width: SCREEN_WIDTH - 48 }, cardStyle]}>
              <Image source={{ uri: track.coverUrl }} style={styles.coverImage} />
              <View style={styles.cardInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {track.artist}
                </Text>
                <Text style={styles.trackGenres}>
                  {track.genres.join(' · ')}
                </Text>
              </View>
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Swipe hints */}
        <View style={styles.hints}>
          <Pressable style={styles.hintButton} onPress={() => animateOut('not_for_me')}>
            <Text style={styles.hintEmoji}>🙅</Text>
            <Text style={styles.hintText}>Not for me</Text>
          </Pressable>
          <Pressable style={styles.hintButton} onPress={() => animateOut('okay')}>
            <Text style={styles.hintEmoji}>😐</Text>
            <Text style={styles.hintText}>Okay</Text>
          </Pressable>
          <Pressable style={styles.hintButton} onPress={() => animateOut('love')}>
            <Text style={styles.hintEmoji}>❤️</Text>
            <Text style={styles.hintText}>Love it</Text>
          </Pressable>
        </View>

        {/* Instructions */}
        <Text style={styles.instructions}>
          ← swipe left: not for me{'\n'}
          ↑ swipe up: okay{'\n'}
          → swipe right: love it
        </Text>
        </Animated.View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.screen,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  fallbackNotice: {
    fontSize: 12,
    color: colors.warning,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  coverImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.border,
  },
  cardInfo: {
    padding: spacing.xl,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  trackArtist: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  trackGenres: {
    ...typo.caption,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hints: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.sm,
  },
  hintButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  hintEmoji: {
    fontSize: 28,
  },
  hintText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  instructions: {
    textAlign: 'center',
    ...typo.small,
    color: colors.textHint,
    paddingBottom: spacing.sm,
    lineHeight: 18,
  },
  earlyExitContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  earlyExitEmoji: {
    fontSize: 64,
    marginBottom: spacing.xl,
  },
  earlyExitTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  earlyExitSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  earlyExitButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxxl,
    marginBottom: spacing.lg,
  },
  earlyExitButtonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  earlyExitContinue: {
    paddingVertical: spacing.md,
  },
  earlyExitContinueText: {
    color: colors.accent,
    fontSize: 14,
  },
});
