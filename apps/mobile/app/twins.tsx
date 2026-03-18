import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/appStore';
import { getTasteTwins } from '../services/api';
import TwinCard from '../components/TwinCard';
import type { TasteTwinsData } from '../../../packages/shared/types';

export default function TwinsScreen() {
  const { t } = useTranslation();
  const session = useAppStore((s) => s.session);
  const router = useRouter();
  const [data, setData] = useState<TasteTwinsData | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    getTasteTwins(userId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>{t('twins.findingTasteTwins')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const twins = data?.twins ?? [];
  const complements = data?.complements ?? [];
  const isEmpty = twins.length === 0 && complements.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with close button */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('twins.tasteTwinsTitle')}</Text>
            <Text style={styles.subtitle}>{t('twins.findSimilarAndComplementary')}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{'\u2715'}</Text>
          </Pressable>
        </View>

        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{t('twins.notEnoughUsers')}</Text>
            <Text style={styles.emptySubtitle}>
              {t('twins.moreUsersMessage')}
            </Text>
          </View>
        ) : (
          <>
            {/* Twins section */}
            {twins.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('twins.mostLikeYou')}</Text>
                <Text style={styles.sectionSubtitle}>{t('twins.mostSimilarTaste')}</Text>
                {twins.map((twin) => (
                  <TwinCard
                    key={twin.anonymousId}
                    label={twin.tasteLabel}
                    distance={twin.distance}
                    type="twin"
                    dominantGenres={twin.dominantGenres}
                  />
                ))}
              </View>
            )}

            {/* Complements section */}
            {complements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('twins.mostComplementary')}</Text>
                <Text style={styles.sectionSubtitle}>{t('twins.distantButSurprising')}</Text>
                {complements.map((comp) => (
                  <TwinCard
                    key={comp.anonymousId}
                    label={comp.tasteLabel}
                    distance={comp.distance}
                    type="complement"
                    dominantGenres={comp.dominantGenres}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 16,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});
