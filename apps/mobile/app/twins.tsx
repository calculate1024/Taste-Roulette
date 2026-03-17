import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/appStore';
import { getTasteTwins } from '../services/api';
import TwinCard from '../components/TwinCard';
import type { TasteTwinsData } from '../../../packages/shared/types';

export default function TwinsScreen() {
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
          <Text style={styles.loadingText}>{'\u6B63\u5728\u5C0B\u627E\u54C1\u5473\u96D9\u80DE\u80CE...'}</Text>
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
            <Text style={styles.title}>{'\u54C1\u5473\u96D9\u80DE\u80CE & \u4E92\u88DC'}</Text>
            <Text style={styles.subtitle}>{'\u627E\u5230\u8207\u4F60\u54C1\u5473\u6700\u76F8\u8FD1\u548C\u6700\u4E92\u88DC\u7684\u4EBA'}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{'\u2715'}</Text>
          </Pressable>
        </View>

        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{'\u9084\u6C92\u6709\u8DB3\u5920\u7684\u7528\u6236'}</Text>
            <Text style={styles.emptySubtitle}>
              {'\u7576\u66F4\u591A\u4EBA\u52A0\u5165 Taste Roulette \u5F8C\uFF0C\u5C31\u80FD\u70BA\u4F60\u914D\u5C0D\u54C1\u5473\u96D9\u80DE\u80CE\u548C\u4E92\u88DC\u5925\u4F34\u4E86\uFF01'}
            </Text>
          </View>
        ) : (
          <>
            {/* Twins section */}
            {twins.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{'\u6700\u50CF\u4F60\u7684\u4EBA'}</Text>
                <Text style={styles.sectionSubtitle}>{'\u54C1\u5473\u6700\u76F8\u8FD1\u7684\u7528\u6236'}</Text>
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
                <Text style={styles.sectionTitle}>{'\u6700\u4E92\u88DC\u7684\u4EBA'}</Text>
                <Text style={styles.sectionSubtitle}>{'\u54C1\u5473\u6709\u8DDD\u96E2\u4F46\u4E0D\u6703\u6392\u65A5\uFF0C\u6700\u6709\u9A5A\u559C\u611F'}</Text>
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
