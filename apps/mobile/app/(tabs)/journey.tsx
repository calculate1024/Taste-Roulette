import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { getTasteJourney } from '../../services/api';
import TasteRadar from '../../components/TasteRadar';
import BadgeGrid from '../../components/BadgeGrid';
import { colors, spacing, radius, typo, layout, shadow } from '../../constants/theme';
import type { TasteJourneyData } from '../../../../packages/shared/types';

export default function JourneyScreen() {
  const { t } = useTranslation();
  const session = useAppStore((s) => s.session);
  const router = useRouter();
  const [data, setData] = useState<TasteJourneyData | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    getTasteJourney(userId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>{t('journey.loadingTasteJourney')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stats = data?.stats ?? {
    totalCards: 0,
    surprisedCount: 0,
    streakCount: 0,
    genresExplored: 0,
    totalRecommendations: 0,
    maxTasteDistance: 0,
  };

  const tasteVector = data?.tasteVector ?? [];
  const isEarlyStage = stats.totalCards < 5;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('journey.tasteJourney')}</Text>
            <Text style={styles.subtitle}>{t('journey.yourMusicExploration')}</Text>
          </View>

          {/* Radar chart */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.radarContainer}>
            <View style={isEarlyStage ? styles.radarEarlyStage : undefined}>
              <TasteRadar tasteVector={tasteVector} size={280} />
            </View>
            {isEarlyStage && (
              <Text style={styles.radarHint}>{t('journey.radarEarlyHint')}</Text>
            )}
          </Animated.View>

          {/* Taste twins button */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Pressable
              style={styles.twinsButton}
              onPress={() => router.push('/twins')}
            >
              <Text style={styles.twinsButtonText}>{t('journey.viewTasteTwins')}</Text>
            </Pressable>
          </Animated.View>

          {/* Stats row */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.genresExplored}</Text>
              <Text style={styles.statLabel}>{t('journey.genresExplored')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>
                {Math.round(stats.maxTasteDistance * 100)}%
              </Text>
              <Text style={styles.statLabel}>{t('journey.furthestDistance')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.surprisedCount}</Text>
              <Text style={styles.statLabel}>{t('journey.totalSurprises')}</Text>
            </View>
          </Animated.View>

          {/* Streak display */}
          {stats.streakCount > 0 && (
            <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.streakCard}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>
                {t('journey.consecutiveDays', { count: stats.streakCount })}
              </Text>
            </Animated.View>
          )}

          {/* Badges section */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>{t('journey.achievementBadges')}</Text>
            <BadgeGrid stats={stats} />
          </Animated.View>
        </ScrollView>
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
    ...layout.center,
  },
  loadingText: {
    ...typo.caption,
    marginTop: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typo.title,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typo.body,
    color: colors.textSecondary,
  },
  radarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  radarEarlyStage: {
    opacity: 0.4,
  },
  radarHint: {
    fontSize: 13,
    color: colors.textHint,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
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
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  streakIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  streakText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: spacing.xl,
  },
  sectionTitle: {
    ...typo.heading,
    marginBottom: spacing.lg,
  },
  twinsButton: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  twinsButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
});
