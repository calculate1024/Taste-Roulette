import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store/appStore';
import { colors, spacing, radius, typo, layout, button, shadow } from '../../constants/theme';

const TOTAL_GENRES = 21;

const TASTE_LABELS_EN: Record<string, string> = {
  'pop': 'Pop Enthusiast', 'rock': 'Rock Explorer', 'hip-hop': 'Hip-Hop Head',
  'r&b': 'R&B Connoisseur', 'jazz': 'Jazz Curious', 'classical': 'Classical Soul',
  'electronic': 'Electronic Voyager', 'latin': 'Latin Lover', 'country': 'Country Roads',
  'folk': 'Folk Storyteller', 'metal': 'Metal Warrior', 'punk': 'Punk Spirit',
  'indie': 'Indie Dreamer', 'soul': 'Soul Searcher', 'blues': 'Blues Traveler',
  'reggae': 'Reggae Vibes', 'world': 'World Wanderer', 'ambient': 'Ambient Drifter',
  'k-pop': 'K-Pop Stan', 'j-pop': 'J-Pop Explorer', 'c-pop': 'C-Pop Fan',
};

const GENRE_EMOJIS: Record<string, string> = {
  'pop': '\uD83C\uDFA4', 'rock': '\uD83C\uDFB8', 'hip-hop': '\uD83C\uDFA4', 'r&b': '\uD83C\uDFB5',
  'jazz': '\uD83C\uDFB7', 'classical': '\uD83C\uDFB9', 'electronic': '\uD83C\uDFA7', 'latin': '\uD83D\uDC83',
  'country': '\uD83E\uDD20', 'folk': '\uD83C\uDF43', 'metal': '\uD83E\uDD18', 'punk': '\u26A1',
  'indie': '\uD83C\uDF19', 'soul': '\u2764\uFE0F', 'blues': '\uD83C\uDFB8', 'reggae': '\uD83C\uDF34',
  'world': '\uD83C\uDF0D', 'ambient': '\uD83C\uDF0A', 'k-pop': '\u2728', 'j-pop': '\uD83C\uDF38', 'c-pop': '\uD83C\uDFEE',
};

export default function ProfileRevealScreen() {
  const { t } = useTranslation();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const { primary, secondary, tertiary, coverage } = useLocalSearchParams<{
    primary: string;
    secondary: string;
    tertiary: string;
    coverage: string;
  }>();

  const coverageNum = parseInt(coverage || '3', 10);
  const remaining = TOTAL_GENRES - coverageNum;

  // Sequential fade-in animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const primaryOpacity = useRef(new Animated.Value(0)).current;
  const secondaryOpacity = useRef(new Animated.Value(0)).current;
  const tertiaryOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = 500;
    const delay = 500;

    Animated.sequence([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.delay(delay),
      Animated.timing(primaryOpacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.delay(delay),
      Animated.timing(secondaryOpacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.delay(delay),
      Animated.timing(tertiaryOpacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.delay(300),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCTA = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const getLabel = (genre: string) => TASTE_LABELS_EN[genre] || genre;
  const getEmoji = (genre: string) => GENRE_EMOJIS[genre] || '\uD83C\uDFB5';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title */}
        <Animated.View style={[styles.titleContainer, { opacity: titleOpacity }]}>
          <Text style={styles.title}>{t('profileReveal.title')}</Text>
        </Animated.View>

        {/* Taste labels */}
        <View style={styles.labelsContainer}>
          {/* Primary */}
          <Animated.View style={[styles.labelRow, { opacity: primaryOpacity }]}>
            <Text style={styles.labelCategory}>{t('profileReveal.primary')}</Text>
            <View style={styles.labelCard}>
              <Text style={styles.labelEmoji}>{getEmoji(primary || '')}</Text>
              <Text style={styles.labelPrimary}>{getLabel(primary || '')}</Text>
            </View>
          </Animated.View>

          {/* Secondary */}
          <Animated.View style={[styles.labelRow, { opacity: secondaryOpacity }]}>
            <Text style={styles.labelCategory}>{t('profileReveal.secondary')}</Text>
            <View style={styles.labelCard}>
              <Text style={styles.labelEmoji}>{getEmoji(secondary || '')}</Text>
              <Text style={styles.labelSecondary}>{getLabel(secondary || '')}</Text>
            </View>
          </Animated.View>

          {/* Tertiary */}
          <Animated.View style={[styles.labelRow, { opacity: tertiaryOpacity }]}>
            <Text style={styles.labelCategory}>{t('profileReveal.tertiary')}</Text>
            <View style={styles.labelCard}>
              <Text style={styles.labelEmoji}>{getEmoji(tertiary || '')}</Text>
              <Text style={styles.labelTertiary}>{getLabel(tertiary || '')}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Coverage info + CTA */}
        <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
          <Text style={styles.coverageText}>
            {t('profileReveal.coverage', { count: coverageNum })}
          </Text>
          <Text style={styles.exploreText}>
            {t('profileReveal.explore', { remaining })}
          </Text>

          <Pressable style={styles.ctaButton} onPress={handleCTA}>
            <Text style={styles.ctaText}>
              {t('profileReveal.seeFirstCard')} {'\u2192'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
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
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: spacing.xxxl,
    alignItems: 'center',
  },
  title: {
    ...typo.hero,
    textAlign: 'center',
  },
  labelsContainer: {
    gap: spacing.xl,
    marginBottom: spacing.xxxl,
  },
  labelRow: {
    alignItems: 'center',
  },
  labelCategory: {
    ...typo.caption,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  labelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    ...shadow.soft,
  },
  labelEmoji: {
    fontSize: 28,
  },
  labelPrimary: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent,
  },
  labelSecondary: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  labelTertiary: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
  },
  coverageText: {
    ...typo.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  exploreText: {
    ...typo.bodyBold,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  ctaButton: {
    ...button.primary,
    width: '100%',
  },
  ctaText: {
    ...button.label,
    fontSize: 18,
  },
});
