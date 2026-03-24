import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';
import { colors, spacing, radius, typo, layout, shadow, button } from '../../constants/theme';

const MIN_GENRES = 3;
const MAX_GENRES = 5;

interface GenreGroup {
  id: string;
  label: string;
  emoji: string;
  genres: string[];
}

const GENRE_GROUPS: GenreGroup[] = [
  { id: 'pop-rnb', label: 'Pop / R&B', emoji: '\uD83C\uDFA4', genres: ['pop', 'r&b'] },
  { id: 'rock-metal', label: 'Rock / Metal', emoji: '\uD83C\uDFB8', genres: ['rock', 'metal'] },
  { id: 'hiphop', label: 'Hip-Hop / Rap', emoji: '\uD83C\uDFA4', genres: ['hip-hop'] },
  { id: 'electronic', label: 'Electronic / Dance', emoji: '\uD83C\uDFA7', genres: ['electronic'] },
  { id: 'jazz-blues', label: 'Jazz / Blues', emoji: '\uD83C\uDFB7', genres: ['jazz', 'blues'] },
  { id: 'classical-ambient', label: 'Classical / Ambient', emoji: '\uD83C\uDFB9', genres: ['classical', 'ambient'] },
  { id: 'indie-folk', label: 'Indie / Folk', emoji: '\uD83C\uDF43', genres: ['indie', 'folk'] },
  { id: 'latin-reggae', label: 'Latin / Reggae', emoji: '\uD83D\uDC83', genres: ['latin', 'reggae'] },
  { id: 'kpop-jpop', label: 'K-Pop / J-Pop', emoji: '\u2728', genres: ['k-pop', 'j-pop', 'c-pop'] },
  { id: 'country-world', label: 'Country / World', emoji: '\uD83C\uDF0D', genres: ['country', 'world', 'soul', 'punk'] },
];

export default function GenrePickScreen() {
  const { t } = useTranslation();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const setSelectedGenres = useAppStore((s) => s.setSelectedGenres);

  const [selected, setSelected] = useState<string[]>([]);

  const cardWidth = (SCREEN_WIDTH - spacing.xl * 2 - spacing.md) / 2;

  const toggleGenre = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((g) => g !== id);
      }
      if (prev.length >= MAX_GENRES) {
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const handleNext = useCallback(() => {
    // Flatten selected genre group IDs into individual genre strings
    const allGenres = GENRE_GROUPS
      .filter((g) => selected.includes(g.id))
      .flatMap((g) => g.genres);
    setSelectedGenres(allGenres);
    router.push('/onboarding/swipe?source=genres');
  }, [selected, setSelectedGenres]);

  const canProceed = selected.length >= MIN_GENRES;
  const isMaxed = selected.length >= MAX_GENRES;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        {/* Progress indicator: step 1 of 3 */}
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('genrePick.title')}</Text>
          <Text style={styles.subtitle}>{t('genrePick.subtitle')}</Text>
        </View>

        {/* Genre grid */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {GENRE_GROUPS.map((group) => {
            const isSelected = selected.includes(group.id);
            return (
              <Pressable
                key={group.id}
                style={[
                  styles.genreCard,
                  { width: cardWidth },
                  isSelected && styles.genreCardSelected,
                ]}
                onPress={() => toggleGenre(group.id)}
              >
                <Text style={styles.genreEmoji}>{group.emoji}</Text>
                <Text style={[styles.genreLabel, isSelected && styles.genreLabelSelected]}>
                  {group.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Status text */}
        <View style={styles.statusRow}>
          {!canProceed && (
            <Text style={styles.statusText}>
              {t('genrePick.minRequired', { min: MIN_GENRES })}
            </Text>
          )}
          {isMaxed && (
            <Text style={styles.statusText}>
              {t('genrePick.maxReached', { max: MAX_GENRES })}
            </Text>
          )}
        </View>

        {/* Next button — hidden when over max */}
        {!isMaxed || canProceed ? (
          <Pressable
            style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canProceed}
          >
            <Text style={[styles.nextButtonText, !canProceed && styles.nextButtonTextDisabled]}>
              {t('genrePick.next')} {'\u2192'}
            </Text>
          </Pressable>
        ) : null}
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
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bgElevated,
  },
  progressDotActive: {
    backgroundColor: colors.accent,
    width: 24,
    borderRadius: 4,
  },
  header: {
    paddingBottom: spacing.xl,
  },
  title: {
    ...typo.title,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typo.body,
    color: colors.textSecondary,
  },
  scrollArea: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  genreCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadow.soft,
  },
  genreCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
    ...shadow.glow(colors.accent),
  },
  genreEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  genreLabel: {
    ...typo.bodyBold,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  genreLabelSelected: {
    color: colors.textPrimary,
  },
  statusRow: {
    minHeight: 24,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statusText: {
    ...typo.caption,
    color: colors.textHint,
  },
  nextButton: {
    ...button.primary,
    marginBottom: spacing.lg,
  },
  nextButtonDisabled: {
    backgroundColor: colors.bgElevated,
  },
  nextButtonText: {
    ...button.label,
  },
  nextButtonTextDisabled: {
    color: colors.textDisabled,
  },
});
