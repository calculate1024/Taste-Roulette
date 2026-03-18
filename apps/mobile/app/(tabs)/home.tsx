import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../../store/appStore';
import { getTodayCard, openCard, submitFeedback } from '../../services/api';
import RouletteCard from '../../components/RouletteCard';
import FeedbackSheet from '../../components/FeedbackSheet';
import ShareCard from '../../components/ShareCard';
import type { FeedbackReaction } from '../../../../packages/shared/types';

export default function HomeScreen() {
  const session = useAppStore((s) => s.session);
  const todayCard = useAppStore((s) => s.todayCard);
  const feedbackGiven = useAppStore((s) => s.feedbackGiven);
  const setTodayCard = useAppStore((s) => s.setTodayCard);
  const setFeedbackGiven = useAppStore((s) => s.setFeedbackGiven);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

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
      dialogTitle: '分享你的品味探索',
    });
    setShowShareCard(false);
  }, []);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>正在載入今日推薦...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6C5CE7"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>今日驚喜</Text>
          <Text style={styles.headerSubtitle}>
            {todayCard ? '有人為你推薦了一首歌' : '今天沒有新推薦'}
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
            <Text style={styles.recommendTitle}>輪到你了！</Text>
            <Text style={styles.recommendSubtitle}>
              推薦一首歌給另一位陌生人
            </Text>
            <Pressable
              style={styles.recommendButton}
              onPress={() => router.push('/recommend')}
            >
              <Text style={styles.recommendButtonText}>去推薦</Text>
            </Pressable>
            <Pressable style={styles.skipButton}>
              <Text style={styles.skipText}>下次再說</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

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
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
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

  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },

  // Recommend-back prompt
  recommendPrompt: {
    marginTop: 24,
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  recommendTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  recommendSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
  },
  recommendButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginBottom: 12,
  },
  recommendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    color: '#8E8E93',
    fontSize: 14,
  },
});
