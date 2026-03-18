import { useReducer, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Linking,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import type { RouletteCard as RouletteCardType, Track } from '../../../packages/shared/types';
import { getAdventureLevel } from '../utils/adventureLevel';

const COVER_SIZE = 260;

interface RouletteCardProps {
  card: (RouletteCardType & { track?: Track; recommender_taste_label?: string }) | null;
  onFeedback: () => void;
}

// State machine for progressive reveal
type RevealStep = 0 | 1 | 2 | 3 | 4;
type RevealAction = { type: 'FLIP' } | { type: 'NEXT' } | { type: 'PLAYER_READY' } | { type: 'RESET' };

function revealReducer(state: RevealStep, action: RevealAction): RevealStep {
  switch (action.type) {
    case 'FLIP': return state === 0 ? 1 : state;
    case 'NEXT':
      if (state === 1) return 2;
      if (state === 2) return 3;
      return state;
    case 'PLAYER_READY': return state === 3 ? 4 : state;
    case 'RESET': return 0;
    default: return state;
  }
}

export default function RouletteCard({ card, onFeedback }: RouletteCardProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_WIDTH = SCREEN_WIDTH - 48;

  const [step, dispatch] = useReducer(revealReducer, 0);

  // Flip animation: 0 = back, 1 = front
  const flipProgress = useSharedValue(0);
  // Content animations
  const coverOpacity = useSharedValue(0);
  const infoSlide = useSharedValue(30);
  const feedbackOpacity = useSharedValue(0);

  // Reset on new card
  useEffect(() => {
    if (card) {
      dispatch({ type: 'RESET' });
      flipProgress.value = 0;
      coverOpacity.value = 0;
      infoSlide.value = 30;
      feedbackOpacity.value = 0;

      // Auto-flip after brief delay
      const timer = setTimeout(() => {
        flipProgress.value = withTiming(1, {
          duration: 800,
          easing: Easing.out(Easing.cubic),
        });
        dispatch({ type: 'FLIP' });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [card, flipProgress, coverOpacity, infoSlide, feedbackOpacity]);

  // Animate per step
  useEffect(() => {
    if (step === 2) {
      coverOpacity.value = withTiming(1, { duration: 600 });
    }
    if (step === 3) {
      infoSlide.value = withSpring(0, { damping: 15 });
    }
    if (step === 4) {
      feedbackOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    }
  }, [step, coverOpacity, infoSlide, feedbackOpacity]);

  // Auto-show feedback 3s after reaching step 3
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => dispatch({ type: 'PLAYER_READY' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleTap = useCallback(() => {
    if (step === 1 || step === 2) {
      dispatch({ type: 'NEXT' });
    }
  }, [step]);

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

  const coverAnimStyle = useAnimatedStyle(() => ({
    opacity: coverOpacity.value,
  }));

  const infoAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(infoSlide.value, [30, 0], [0, 1]),
    transform: [{ translateY: infoSlide.value }],
  }));

  const feedbackAnimStyle = useAnimatedStyle(() => ({
    opacity: feedbackOpacity.value,
  }));

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
  const adventure = getAdventureLevel(card.tasteDistance);
  const tasteLabel = (card as any).recommender_taste_label || card.recommenderTasteLabel || '某位音樂愛好者';
  const spotifyEmbedUrl = track?.spotifyId
    ? `https://open.spotify.com/embed/track/${track.spotifyId}?theme=0`
    : null;

  return (
    <View style={styles.wrapper}>
      {/* Back of card */}
      <Animated.View style={[styles.cardBack, { width: CARD_WIDTH, height: CARD_WIDTH * 1.4 }, backStyle]}>
        <Text style={styles.cardBackEmoji}>🎲</Text>
        <Text style={styles.cardBackText}>Taste Roulette</Text>
      </Animated.View>

      {/* Front of card */}
      <Animated.View style={[styles.card, { width: CARD_WIDTH }, frontStyle]}>
        <Pressable onPress={handleTap} style={styles.cardPressable}>

          {/* === STEP 1: Recommender identity + adventure level === */}
          {step >= 1 && step < 2 && (
            <Animated.View entering={FadeIn.duration(500)} style={styles.identityContainer}>
              <Text style={styles.identityPrefix}>一位</Text>
              <Text style={[styles.identityLabel, { color: adventure.color }]}>
                {tasteLabel}
              </Text>
              <Text style={styles.identityPrefix}>推薦了你一首歌</Text>

              {tastePercent !== null && (
                <View style={styles.adventureSection}>
                  <View style={[styles.adventureBadge, { borderColor: adventure.color }]}>
                    <Text style={styles.adventureEmoji}>{adventure.emoji}</Text>
                    <Text style={[styles.adventureLabel, { color: adventure.color }]}>
                      {adventure.label}
                    </Text>
                  </View>
                  <Text style={styles.distanceText}>品味距離 {tastePercent}%</Text>
                  <Text style={[styles.adventureDesc, { color: adventure.color }]}>
                    {adventure.description}
                  </Text>
                </View>
              )}

              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>點擊揭示 →</Text>
              </View>
            </Animated.View>
          )}

          {/* === STEP 2: Cover + Track name === */}
          {step >= 2 && (
            <Animated.View style={coverAnimStyle}>
              {track?.coverUrl ? (
                <Image source={{ uri: track.coverUrl }} style={styles.coverImage} />
              ) : (
                <View style={[styles.coverImage, styles.coverPlaceholder]}>
                  <Text style={styles.coverPlaceholderText}>🎵</Text>
                </View>
              )}
            </Animated.View>
          )}

          <View style={styles.cardContent}>
            {/* Adventure badge (compact, shown from step 2+) */}
            {step >= 2 && tastePercent !== null && (
              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.compactBadgeRow}>
                <View style={[styles.compactBadge, { backgroundColor: `${adventure.color}20`, borderColor: `${adventure.color}40` }]}>
                  <Text style={{ fontSize: 10 }}>{adventure.emoji}</Text>
                  <Text style={[styles.compactBadgeText, { color: adventure.color }]}>
                    {adventure.label} · {tastePercent}%
                  </Text>
                </View>
                <Text style={[styles.tasteLabelCompact, { color: adventure.color }]}>
                  from {tasteLabel}
                </Text>
              </Animated.View>
            )}

            {/* Track info (step 2+) */}
            {step >= 2 && (
              <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                <Text style={styles.trackTitle} numberOfLines={2}>
                  {track?.title ?? '未知曲目'}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {track?.artist ?? '未知藝人'}
                </Text>
              </Animated.View>
            )}

            {/* Tap hint for step 2 */}
            {step === 2 && (
              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>點擊聆聽 →</Text>
              </View>
            )}

            {/* === STEP 3: Reason + Player === */}
            {step >= 3 && (
              <Animated.View style={infoAnimStyle}>
                {card.reason && (
                  <Text style={styles.reason} numberOfLines={3}>
                    「{card.reason}」
                  </Text>
                )}

                {spotifyEmbedUrl ? (
                  <View style={styles.playerContainer}>
                    <WebView
                      source={{ uri: spotifyEmbedUrl }}
                      style={styles.player}
                      scrollEnabled={false}
                      allowsInlineMediaPlayback
                      mediaPlaybackRequiresUserAction={false}
                    />
                  </View>
                ) : track?.spotifyId ? (
                  <Pressable
                    style={styles.openSpotifyButton}
                    onPress={() => Linking.openURL(`https://open.spotify.com/track/${track.spotifyId}`)}
                  >
                    <Text style={styles.openSpotifyText}>Open in Spotify</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.noPreviewText}>No preview available</Text>
                )}
              </Animated.View>
            )}

            {/* === STEP 4: Feedback button === */}
            {step >= 4 && (
              <Animated.View style={feedbackAnimStyle}>
                <Pressable style={styles.feedbackButton} onPress={onFeedback}>
                  <Text style={styles.feedbackButtonText}>給個回饋</Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        </Pressable>
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
  emptyIcon: { fontSize: 64, marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: '#8E8E93', textAlign: 'center' },

  // Card back
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
  cardBackEmoji: { fontSize: 64, marginBottom: 16 },
  cardBackText: { fontSize: 24, fontWeight: '700', color: '#6C5CE7' },

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
  cardPressable: {
    flex: 1,
  },

  // Step 1: Identity
  identityContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    minHeight: 380,
  },
  identityPrefix: {
    fontSize: 18,
    color: '#BBBBBB',
    marginBottom: 4,
    textAlign: 'center',
  },
  identityLabel: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: 8,
    textAlign: 'center',
  },
  adventureSection: {
    alignItems: 'center',
    marginTop: 32,
  },
  adventureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  adventureEmoji: { fontSize: 16, marginRight: 8 },
  adventureLabel: { fontSize: 16, fontWeight: '700' },
  distanceText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  adventureDesc: {
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Tap hint
  tapHint: {
    marginTop: 24,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },

  // Cover
  coverImage: {
    width: '100%',
    height: COVER_SIZE,
    backgroundColor: '#2A2A3E',
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: { fontSize: 64 },

  // Card content
  cardContent: { padding: 20 },

  // Compact badge (step 2+)
  compactBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  compactBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  tasteLabelCompact: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
  },

  // Track info
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

  // Reason
  reason: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#BBBBBB',
    lineHeight: 20,
    marginBottom: 16,
  },

  // Player
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
  openSpotifyButton: {
    backgroundColor: '#1DB954',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  openSpotifyText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  noPreviewText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Feedback
  feedbackButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  feedbackButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
