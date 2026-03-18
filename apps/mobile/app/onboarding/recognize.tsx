import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { getAuthHeaders } from '../../services/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const TOTAL_TRACKS = 25;
const MIN_RECOGNIZED = 8;

interface TrackItem {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
}

export default function OnboardingRecognizeScreen() {
  const setRecognizedTracks = useAppStore((s) => s.setRecognizedTracks);

  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recognized, setRecognized] = useState<string[]>([]);

  // Fetch tracks from API
  useEffect(() => {
    async function fetchTracks() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/api/onboarding/tracks`, { headers });
        if (!res.ok) throw new Error('Failed to fetch tracks');
        const data = await res.json();
        const mapped: TrackItem[] = (data.tracks || []).slice(0, TOTAL_TRACKS).map((t: any) => ({
          id: t.spotify_id,
          title: t.title,
          artist: t.artist,
          coverUrl: t.cover_url || '',
        }));
        setTracks(mapped);
      } catch (err) {
        console.error('Failed to fetch recognition tracks:', err);
        // Use empty array — user can still proceed
        setTracks([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTracks();
  }, []);

  const handleFinish = useCallback(() => {
    setRecognizedTracks(recognized);
    router.push('/onboarding/swipe?source=recognize');
  }, [recognized, setRecognizedTracks]);

  const handleResponse = useCallback(
    (heard: boolean) => {
      const track = tracks[currentIndex];
      if (!track) return;

      const newRecognized = heard ? [...recognized, track.id] : recognized;
      if (heard) {
        setRecognized(newRecognized);
      }

      const nextIndex = currentIndex + 1;
      const isLast = nextIndex >= tracks.length;

      // Auto-finish if all tracks shown or enough recognized
      if (isLast || newRecognized.length >= MIN_RECOGNIZED) {
        setRecognizedTracks(newRecognized);
        router.push('/onboarding/swipe?source=recognize');
        return;
      }

      setCurrentIndex(nextIndex);
    },
    [tracks, currentIndex, recognized, setRecognizedTracks]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6C5CE7" size="large" />
          <Text style={styles.loadingText}>Loading tracks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (tracks.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Could not load tracks.</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => router.push('/onboarding/swipe?source=fallback')}
          >
            <Text style={styles.retryButtonText}>Continue anyway</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const track = tracks[currentIndex];
  const progress = ((currentIndex + 1) / tracks.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{'\u4F60\u807D\u904E\u9019\u4E9B\u6B4C\u55CE\uFF1F'}</Text>
        <Text style={styles.headerSubtitle}>
          {currentIndex + 1} / {tracks.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Recognized count */}
      <Text style={styles.recognizedCount}>
        {'\u5DF2\u8FA8\u8B58'}: {recognized.length} {'\u9996'}
        {recognized.length < MIN_RECOGNIZED && (
          ` (${'\u9700\u8981'} ${MIN_RECOGNIZED} ${'\u9996\u4EE5\u4E0A'})`
        )}
      </Text>

      {/* Track card */}
      {track && (
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Image source={{ uri: track.coverUrl }} style={styles.coverImage} />
            <View style={styles.cardInfo}>
              <Text style={styles.trackTitle} numberOfLines={2}>
                {track.title}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {track.artist}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.actionButton, styles.noButton]}
          onPress={() => handleResponse(false)}
        >
          <Text style={styles.actionButtonEmoji}>✗</Text>
          <Text style={styles.actionButtonText}>{'\u6C92\u807D\u904E'}</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.yesButton]}
          onPress={() => handleResponse(true)}
        >
          <Text style={styles.actionButtonEmoji}>✓</Text>
          <Text style={styles.actionButtonText}>{'\u807D\u904E'}</Text>
        </Pressable>
      </View>

      {/* Skip to finish (if enough recognized) */}
      {recognized.length >= MIN_RECOGNIZED && (
        <Pressable style={styles.skipFinish} onPress={handleFinish}>
          <Text style={styles.skipFinishText}>
            {'\u5DF2\u8DB3\u5920\uFF0C\u958B\u59CB\u54C1\u5473\u5206\u6790'} →
          </Text>
        </Pressable>
      )}
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
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  recognizedCount: {
    fontSize: 14,
    color: '#6C5CE7',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
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
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    paddingBottom: 24,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  coverImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#2A2A3E',
    marginTop: 24,
  },
  cardInfo: {
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  trackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  trackArtist: {
    fontSize: 16,
    color: '#BBBBBB',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
    paddingBottom: 16,
    paddingTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  noButton: {
    backgroundColor: '#2A2A3E',
  },
  yesButton: {
    backgroundColor: '#6C5CE7',
  },
  actionButtonEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipFinish: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  skipFinishText: {
    fontSize: 15,
    color: '#6C5CE7',
    fontWeight: '600',
  },
});
