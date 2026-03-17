import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import type { RouletteCard as RouletteCardType, Track } from '../../../packages/shared/types';

const COVER_SIZE = 280;

interface RouletteCardProps {
  card: (RouletteCardType & { track?: Track }) | null;
  onFeedback: () => void;
}

export default function RouletteCard({ card, onFeedback }: RouletteCardProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_WIDTH = SCREEN_WIDTH - 48;

  // Flip animation value: 0 = back, 1 = front
  const flipProgress = useSharedValue(0);

  useEffect(() => {
    if (card) {
      // Animate the card flip on first reveal
      flipProgress.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [card, flipProgress]);

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [90, 0]);
    const opacity = interpolate(flipProgress.value, [0, 0.5, 1], [0, 0, 1]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      opacity,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipProgress.value, [0, 1], [0, -90]);
    const opacity = interpolate(flipProgress.value, [0, 0.5, 1], [1, 0, 0]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      opacity,
    };
  });

  // Empty state
  if (!card) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🕐</Text>
        <Text style={styles.emptyTitle}>今天還沒有卡片</Text>
        <Text style={styles.emptySubtitle}>明天再來看看吧！</Text>
      </View>
    );
  }

  const track = card.track;
  const tastePercent = card.tasteDistance
    ? Math.round(card.tasteDistance * 100)
    : null;
  const spotifyEmbedUrl = track?.spotifyId
    ? `https://open.spotify.com/embed/track/${track.spotifyId}?theme=0`
    : null;

  return (
    <View style={styles.wrapper}>
      {/* Back of card (shown briefly during flip) */}
      <Animated.View style={[styles.cardBack, { width: CARD_WIDTH, height: CARD_WIDTH * 1.4 }, backStyle]}>
        <Text style={styles.cardBackEmoji}>🎲</Text>
        <Text style={styles.cardBackText}>Taste Roulette</Text>
      </Animated.View>

      {/* Front of card */}
      <Animated.View style={[styles.card, { width: CARD_WIDTH }, frontStyle]}>
        {/* Cover image */}
        {track?.coverUrl ? (
          <Image source={{ uri: track.coverUrl }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, styles.coverPlaceholder]}>
            <Text style={styles.coverPlaceholderText}>🎵</Text>
          </View>
        )}

        {/* Card content */}
        <View style={styles.cardContent}>
          {/* Taste distance badge */}
          {tastePercent !== null && (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceBadgeText}>
                品味距離 {tastePercent}%
              </Text>
            </View>
          )}

          {/* Track info */}
          <Text style={styles.trackTitle} numberOfLines={2}>
            {track?.title ?? '未知曲目'}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {track?.artist ?? '未知藝人'}
          </Text>

          {/* Reason */}
          {card.reason && (
            <Text style={styles.reason} numberOfLines={3}>
              「{card.reason}」
            </Text>
          )}

          {/* Spotify Embed player */}
          {spotifyEmbedUrl && (
            <View style={styles.playerContainer}>
              <WebView
                source={{ uri: spotifyEmbedUrl }}
                style={styles.player}
                scrollEnabled={false}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
              />
            </View>
          )}

          {/* Feedback button */}
          <Pressable style={styles.feedbackButton} onPress={onFeedback}>
            <Text style={styles.feedbackButtonText}>給個回饋</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // Card back (during flip)
  cardBack: {
    position: 'absolute',
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backfaceVisibility: 'hidden',
  },
  cardBackEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  cardBackText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6C5CE7',
  },

  // Card front
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    backfaceVisibility: 'hidden',
  },

  coverImage: {
    width: '100%',
    height: COVER_SIZE,
    backgroundColor: '#2A2A3E',
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    fontSize: 64,
  },

  cardContent: {
    padding: 20,
  },

  distanceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  distanceBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C5CE7',
  },

  trackTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 12,
  },

  reason: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#BBBBBB',
    lineHeight: 20,
    marginBottom: 16,
  },

  playerContainer: {
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#000',
  },
  player: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  feedbackButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  feedbackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
