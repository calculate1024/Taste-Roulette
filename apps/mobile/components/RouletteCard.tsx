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
// WebView embed removed — cookie consent popup blocks playback.
// Using "Open in Spotify" deep link instead.
import { useTranslation } from 'react-i18next';
import type { RouletteCard as RouletteCardType, Track } from '../../../packages/shared/types';
import { getAdventureLevel } from '../utils/adventureLevel';
import { colors, spacing, radius, typo, shadow } from '../constants/theme';

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
  const { t, i18n } = useTranslation();
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
        <Text style={styles.emptyIcon}>🎵</Text>
        <Text style={styles.emptyTitle}>{t('rouletteCard.nextSurpriseTomorrow')}</Text>
        <Text style={styles.emptySubtitle}>{t('rouletteCard.pullToRefresh')}</Text>
      </View>
    );
  }

  const track = card.track;
  const tastePercent = card.tasteDistance
    ? Math.round(card.tasteDistance * 100)
    : null;
  const adventure = getAdventureLevel(card.tasteDistance);
  const tasteLabel = (card as any).recommender_taste_label || card.recommenderTasteLabel || t('rouletteCard.someMusicLover');
  const spotifyTrackUrl = track?.spotifyId
    ? `https://open.spotify.com/track/${track.spotifyId}`
    : null;

  return (
    <View style={styles.wrapper}>
      {/* Subtle glow behind card */}
      <View style={[styles.glowLayer, shadow.glow(adventure.color)]} />

      {/* Back of card */}
      <Animated.View style={[styles.cardBack, { width: CARD_WIDTH, height: CARD_WIDTH * 1.4 }, backStyle]}>
        <Text style={styles.cardBackEmoji}>🎲</Text>
        <Text style={styles.cardBackText}>Taste Roulette</Text>
      </Animated.View>

      {/* Front of card */}
      <Animated.View style={[styles.card, { width: CARD_WIDTH }, frontStyle]}>
        <Pressable onPress={handleTap} style={styles.cardPressable}>

          {/* Step counter (steps 1-3) */}
          {step >= 1 && step <= 3 && (
            <Text style={styles.stepCounter}>
              {t('rouletteCard.stepCounter', { current: step, total: 4 })}
            </Text>
          )}

          {/* === STEP 1: Recommender identity + adventure level === */}
          {step >= 1 && step < 2 && (
            <Animated.View entering={FadeIn.duration(500)} style={styles.identityContainer}>
              <Text style={styles.identityPrefix}>{t('rouletteCard.aPrefix')}</Text>
              <Text style={[styles.identityLabel, { color: adventure.color }]}>
                {tasteLabel}
              </Text>
              <Text style={styles.identityPrefix}>{t('rouletteCard.someoneRecommended')}</Text>

              {tastePercent !== null && (
                <View style={styles.adventureSection}>
                  <View style={[
                    styles.adventureBadge,
                    { borderColor: adventure.color },
                    shadow.glow(adventure.color),
                  ]}>
                    <Text style={styles.adventureEmoji}>{adventure.emoji}</Text>
                    <Text style={[styles.adventureLabel, { color: adventure.color }]}>
                      {t(adventure.labelKey)}
                    </Text>
                  </View>
                  <Text style={styles.distanceText}>{t('rouletteCard.tasteDistance', { percent: tastePercent })}</Text>
                  <Text style={styles.distanceExplanation}>{t('rouletteCard.distanceExplanation')}</Text>
                  <Text style={[styles.adventureDesc, { color: adventure.color }]}>
                    {t(adventure.descriptionKey)}
                  </Text>
                </View>
              )}

              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>{t('rouletteCard.tapToReveal')}</Text>
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
                    {t(adventure.labelKey)} · {tastePercent}%
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
                  {track?.title ?? t('rouletteCard.unknownTrack')}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {track?.artist ?? t('rouletteCard.unknownArtist')}
                </Text>
              </Animated.View>
            )}

            {/* Tap hint for step 2 */}
            {step === 2 && (
              <View style={styles.tapHint}>
                <Text style={styles.tapHintText}>{t('rouletteCard.tapToListen')}</Text>
              </View>
            )}

            {/* === STEP 3: Reason + Player === */}
            {step >= 3 && (
              <Animated.View style={infoAnimStyle}>
                {card.reason && (
                  <Text style={styles.reason} numberOfLines={3}>
                    「{(i18n.language === 'en' && (card as any).reasonEn) ? (card as any).reasonEn : card.reason}」
                  </Text>
                )}

                {spotifyTrackUrl ? (
                  <Pressable
                    style={styles.openSpotifyButton}
                    onPress={() => Linking.openURL(spotifyTrackUrl)}
                  >
                    <Text style={styles.spotifyIcon}>🎵</Text>
                    <Text style={styles.openSpotifyText}>{t('rouletteCard.listenOnSpotify')}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.noPreviewText}>{t('rouletteCard.noPreview')}</Text>
                )}
              </Animated.View>
            )}

            {/* === STEP 4: Feedback button === */}
            {step >= 4 && (
              <Animated.View style={feedbackAnimStyle}>
                <Pressable style={styles.feedbackButton} onPress={onFeedback}>
                  <Text style={styles.feedbackButtonText}>{t('rouletteCard.giveFeedback')}</Text>
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
    paddingHorizontal: spacing.xl,
  },

  // Glow layer behind card
  glowLayer: {
    position: 'absolute',
    width: '80%',
    height: '60%',
    borderRadius: radius.xl,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  emptyIcon: { fontSize: 64, marginBottom: spacing.xl },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center' },

  // Card back
  cardBack: {
    position: 'absolute',
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backfaceVisibility: 'hidden',
  },
  cardBackEmoji: { fontSize: 64, marginBottom: spacing.lg },
  cardBackText: { fontSize: 24, fontWeight: '700', color: colors.accent },

  // Step counter
  stepCounter: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    fontSize: 12,
    color: colors.textSecondary,
    zIndex: 10,
  },

  // Card front
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
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
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    minHeight: 380,
  },
  identityPrefix: {
    fontSize: 18,
    color: colors.textHint,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  identityLabel: {
    fontSize: 28,
    fontWeight: '800',
    marginVertical: spacing.sm,
    textAlign: 'center',
  },
  adventureSection: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  adventureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  adventureEmoji: { fontSize: 16, marginRight: spacing.sm },
  adventureLabel: { fontSize: 16, fontWeight: '700' },
  distanceText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  distanceExplanation: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  adventureDesc: {
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Tap hint
  tapHint: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 14,
    color: colors.textHint,
    fontWeight: '600',
  },

  // Cover
  coverImage: {
    width: '100%',
    height: COVER_SIZE,
    backgroundColor: colors.bgCard,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: { fontSize: 64 },

  // Card content
  cardContent: { padding: spacing.xl - 4 },

  // Compact badge (step 2+)
  compactBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
  },
  compactBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: spacing.xs,
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
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  trackArtist: {
    ...typo.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // Reason
  reason: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.textHint,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },

  // Spotify button
  openSpotifyButton: {
    backgroundColor: colors.spotify,
    borderRadius: radius.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  spotifyIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  openSpotifyText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  noPreviewText: {
    ...typo.caption,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Feedback
  feedbackButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  feedbackButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
});
