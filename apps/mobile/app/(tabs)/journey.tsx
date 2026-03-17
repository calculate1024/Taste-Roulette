import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/appStore';
import { getTasteJourney } from '../../services/api';
import TasteRadar from '../../components/TasteRadar';
import BadgeGrid from '../../components/BadgeGrid';
import type { TasteJourneyData } from '../../../../packages/shared/types';

export default function JourneyScreen() {
  const session = useAppStore((s) => s.session);
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
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>{'\u6B63\u5728\u8F09\u5165\u54C1\u5473\u65C5\u7A0B...'}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{'\u54C1\u5473\u65C5\u7A0B'}</Text>
          <Text style={styles.subtitle}>{'\u4F60\u7684\u97F3\u6A02\u63A2\u7D22\u8ECC\u8DE1'}</Text>
        </View>

        {/* Radar chart */}
        <View style={styles.radarContainer}>
          <TasteRadar tasteVector={tasteVector} size={280} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.genresExplored}</Text>
            <Text style={styles.statLabel}>{'\u5DF2\u63A2\u7D22\u985E\u578B'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {Math.round(stats.maxTasteDistance * 100)}%
            </Text>
            <Text style={styles.statLabel}>{'\u6700\u9060\u8DDD\u96E2'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.surprisedCount}</Text>
            <Text style={styles.statLabel}>{'\u7E3D\u9A5A\u559C\u6B21\u6578'}</Text>
          </View>
        </View>

        {/* Streak display */}
        {stats.streakCount > 0 && (
          <View style={styles.streakCard}>
            <Text style={styles.streakIcon}>{'\u{1F525}'}</Text>
            <Text style={styles.streakText}>
              {'\u9023\u7E8C '}{stats.streakCount}{' \u5929'}
            </Text>
          </View>
        )}

        {/* Badges section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'\u6210\u5C31\u5F7D\u7AE0'}</Text>
          <BadgeGrid stats={stats} />
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  radarContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  streakIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
});
