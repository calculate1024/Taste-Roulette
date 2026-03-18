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
} from 'react-native-reanimated';
import { useAppStore } from '../../store/appStore';
import { supabase } from '../../services/supabase';
import { getAuthHeaders } from '../../services/supabase';
import { ONBOARDING_TRACKS, OnboardingTrack } from '../../constants/mockTracks';

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
          <ActivityIndicator color="#6C5CE7" size="large" />
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
        <View style={styles.earlyExitContainer}>
          <Text style={styles.earlyExitEmoji}>🎯</Text>
          <Text style={styles.earlyExitTitle}>We've got your vibe!</Text>
          <Text style={styles.earlyExitSubtitle}>
            Looks like your taste is clear. Ready to start discovering?
          </Text>
          <Pressable style={styles.earlyExitButton} onPress={finishOnboarding} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
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
        </View>
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  fallbackNotice: {
    fontSize: 12,
    color: '#FF9F43',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#999',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#1A1A2E',
    marginHorizontal: 24,
    marginTop: 12,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 2,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  coverImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#2A2A3E',
  },
  cardInfo: {
    padding: 20,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 16,
    color: '#BBBBBB',
    marginBottom: 8,
  },
  trackGenres: {
    fontSize: 13,
    color: '#6C5CE7',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hints: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
    paddingBottom: 8,
  },
  hintButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  hintEmoji: {
    fontSize: 28,
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  instructions: {
    textAlign: 'center',
    fontSize: 11,
    color: '#555',
    paddingBottom: 8,
    lineHeight: 18,
  },
  earlyExitContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  earlyExitEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  earlyExitTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  earlyExitSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  earlyExitButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 16,
  },
  earlyExitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  earlyExitContinue: {
    paddingVertical: 12,
  },
  earlyExitContinueText: {
    color: '#6C5CE7',
    fontSize: 14,
  },
});
