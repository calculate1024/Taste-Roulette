import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../../store/appStore';
import { getTodayCard, openCard, submitFeedback, getYesterdayEcho } from '../../services/api';
import type { YesterdayEcho } from '../../services/api';
import RouletteCard from '../../components/RouletteCard';
import FeedbackSheet from '../../components/FeedbackSheet';
import ShareCard from '../../components/ShareCard';
import YesterdayEchoToast from '../../components/YesterdayEcho';
import BlurBackground from '../../components/BlurBackground';
import SkeletonCard from '../../components/SkeletonCard';
import { colors, spacing, radius, typo, button, layout, shadow } from '../../constants/theme';
import type { FeedbackReaction } from '../../../../packages/shared/types';

export default function HomeScreen() {
  const { t } = useTranslation();
  const session = useAppStore((s) => s.session);
  const todayCard = useAppStore((s) => s.todayCard);
  const feedbackGiven = useAppStore((s) => s.feedbackGiven);
  const setTodayCard = useAppStore((s) => s.setTodayCard);
  const setFeedbackGiven = useAppStore((s) => s.setFeedbackGiven);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [echo, setEcho] = useState<YesterdayEcho | null>(null);

  const userId = session?.user?.id;

  const fetchCard = useCallback(async () => {
    if (!userId) return;
    try {
      const card = await getTodayCard(userId);
      setTodayCard(card);

      // Mark as opened if pending/delivered
      if (card && (card.status === 'pending' || card.status === 'delivered')) {
        await openCard(card.id);
      }

      // Check if feedback was already given
      if (card?.status === 'feedback_given') {
        setFeedbackGiven(true);
      }
    } catch {
      // Silently fail — empty state will show
    } finally {
      setLoading(false);
    }
  }, [userId, setTodayCard, setFeedbackGiven]);

  useEffect(() => {
    fetchCard();
    getYesterdayEcho().then(setEcho).catch(() => {});
  }, [fetchCard]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCard();
    setRefreshing(false);
  }, [fetchCard]);

  const handleFeedbackSubmit = useCallback(
    async (reaction: FeedbackReaction, comment?: string) => {
      if (!todayCard || !userId) return null;
      const insight = await submitFeedback(todayCard.id, userId, reaction, comment);
      setFeedbackGiven(true);
      return insight;
    },
    [todayCard, userId, setFeedbackGiven]
  );

  const handleFeedbackClose = useCallback(() => {
    setFeedbackVisible(false);
  }, []);

  const handleSharePress = useCallback(() => {
    setFeedbackVisible(false);
    setShowShareCard(true);
  }, []);

  const handleShare = useCallback(async (uri: string) => {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: t('home.shareYourTaste'),
    });
    setShowShareCard(false);
  }, []);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <BlurBackground imageUrl={null} />
        <View style={styles.loadingContainer}>
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BlurBackground imageUrl={todayCard?.track?.coverUrl ?? null} />
      <Animated.View entering={FadeIn.duration(400)} style={styles.animatedContent}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
        >
          {/* Yesterday's echo toast */}
          {echo && (
            <YesterdayEchoToast echo={echo} onDismiss={() => setEcho(null)} />
          )}

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('home.todaySurprise')}</Text>
            <Text style={styles.headerSubtitle}>
              {todayCard ? t('home.someoneRecommended') : t('home.noNewRecommendation')}
            </Text>
          </View>

          {/* Card or empty state */}
          <RouletteCard
            card={todayCard}
            onFeedback={() => setFeedbackVisible(true)}
          />

          {/* Post-feedback: recommend-back prompt */}
          {feedbackGiven && (
            <View style={styles.recommendPrompt}>
              <Text style={styles.recommendTitle}>{t('home.yourTurn')}</Text>
              <Text style={styles.recommendSubtitle}>
                {t('home.recommendToStranger')}
              </Text>
              <Pressable
                style={styles.recommendButton}
                onPress={() => {
                  const track = todayCard?.track;
                  if (track) {
                    router.push({
                      pathname: '/recommend',
                      params: {
                        contextTitle: track.title,
                        contextArtist: track.artist,
                        contextGenre: track.genres?.[0] || '',
                      },
                    });
                  } else {
                    router.push('/recommend');
                  }
                }}
              >
                <Text style={styles.recommendButtonText}>{t('home.goRecommend')}</Text>
              </Pressable>
              <Pressable style={styles.skipButton}>
                <Text style={styles.skipText}>{t('home.maybeLater')}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Feedback bottom sheet */}
      <FeedbackSheet
        visible={feedbackVisible}
        cardId={todayCard?.id ?? ''}
        tasteDistance={todayCard?.tasteDistance ?? 0.5}
        onSubmit={handleFeedbackSubmit}
        onClose={handleFeedbackClose}
        onSharePress={handleSharePress}
      />

      {/* Share card modal */}
      {showShareCard && todayCard?.track && (
        <ShareCard
          track={{
            title: todayCard.track.title,
            artist: todayCard.track.artist,
            coverUrl: todayCard.track.coverUrl ?? '',
          }}
          tasteDistance={todayCard.tasteDistance ?? 0.5}
          onShare={handleShare}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.screen,
  },
  animatedContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    ...layout.center,
  },

  // Header
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typo.title,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typo.body,
    color: colors.textSecondary,
  },

  // Recommend-back prompt
  recommendPrompt: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendTitle: {
    ...typo.heading,
    marginBottom: spacing.sm,
  },
  recommendSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  recommendButton: {
    ...button.primary,
    paddingHorizontal: spacing.xxxl,
    marginBottom: spacing.md,
  },
  recommendButtonText: {
    ...button.label,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
