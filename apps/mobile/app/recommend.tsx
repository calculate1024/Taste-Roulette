import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { useAppStore } from '../store/appStore';
import { searchTracks, submitRecommendation } from '../services/api';
import { colors, spacing, radius, typo, layout, shadow } from '../constants/theme';
import type { Track } from '../../../packages/shared/types';

export default function RecommendScreen() {
  const session = useAppStore((s) => s.session);
  const userId = session?.user?.id;
  const params = useLocalSearchParams<{
    contextTitle?: string;
    contextArtist?: string;
    contextGenre?: string;
  }>();

  const hasContext = !!params.contextTitle;
  const headerSubtitle = hasContext
    ? `你剛聽了「${params.contextTitle}」— 推薦一首同樣精彩的歌`
    : '推薦一首你喜歡的歌給陌生人';
  const reasonPlaceholder = hasContext
    ? `跟 ${params.contextArtist} 比起來，這首歌為什麼值得一聽？`
    : '用一句話告訴對方為什麼要聽這首';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gotBonusCard, setGotBonusCard] = useState(false);

  // Success animation
  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successOpacity.value,
  }));

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const tracks = await searchTracks(query.trim());
      setResults(tracks);
    } catch (e) {
      Alert.alert('Search failed', 'Please try again later.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleSelect = useCallback((track: Track) => {
    setSelectedTrack(track);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedTrack || !reason.trim() || !userId) return;
    setSubmitting(true);
    try {
      const result = await submitRecommendation(userId, selectedTrack.spotifyId, reason.trim());
      setSubmitted(true);
      if (result.bonus_card) setGotBonusCard(true);
      // Play success animation
      successOpacity.value = withTiming(1, { duration: 300 });
      successScale.value = withSequence(
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 200 })
      );
    } finally {
      setSubmitting(false);
    }
  }, [selectedTrack, reason, userId, successScale, successOpacity]);

  // Navigate back after successful submission
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (submitted) {
      timeoutId = setTimeout(() => router.back(), 2000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [submitted]);

  // Success state
  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.successContainer, successStyle]}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>推薦已送出！</Text>
          <Text style={styles.successSubtitle}>
            某位陌生人即將收到你的推薦
          </Text>
          {gotBonusCard && (
            <Text style={styles.bonusText}>
              🎁 你獲得了一張 Bonus 卡片！
            </Text>
          )}
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>推薦一首歌</Text>
            <Text style={styles.headerSubtitle}>
              {headerSubtitle}
            </Text>
          </View>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.skipText}>下次再說</Text>
          </Pressable>
        </View>

        {/* Selected track preview */}
        {selectedTrack && (
          <View style={styles.selectedContainer}>
            <View style={styles.selectedCard}>
              {selectedTrack.coverUrl && (
                <Image
                  source={{ uri: selectedTrack.coverUrl }}
                  style={styles.selectedCover}
                />
              )}
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedTitle} numberOfLines={1}>
                  {selectedTrack.title}
                </Text>
                <Text style={styles.selectedArtist} numberOfLines={1}>
                  {selectedTrack.artist}
                </Text>
              </View>
              <Pressable
                style={styles.changeButton}
                onPress={() => setSelectedTrack(null)}
              >
                <Text style={styles.changeText}>換一首</Text>
              </Pressable>
            </View>

            {/* Reason input */}
            <TextInput
              style={styles.reasonInput}
              placeholder={reasonPlaceholder}
              placeholderTextColor={colors.textHint}
              value={reason}
              onChangeText={setReason}
              maxLength={100}
              multiline
              numberOfLines={2}
            />
            <Text style={styles.charCount}>{reason.length}/100</Text>

            {/* Submit button */}
            <Pressable
              style={[
                styles.submitButton,
                (!reason.trim() || submitting) && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!reason.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textPrimary} size="small" />
              ) : (
                <Text style={styles.submitText}>送出推薦</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Search bar — hidden when track is selected */}
        {!selectedTrack && (
          <>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="搜尋歌曲或藝人..."
                placeholderTextColor={colors.textHint}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoFocus
              />
              <Pressable style={styles.searchButton} onPress={handleSearch}>
                <Text style={styles.searchButtonText}>搜尋</Text>
              </Pressable>
            </View>

            {/* Search results */}
            {searching ? (
              <ActivityIndicator
                size="large"
                color={colors.accent}
                style={styles.loader}
              />
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.spotifyId}
                contentContainerStyle={styles.resultsList}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.resultItem}
                    onPress={() => handleSelect(item)}
                  >
                    {item.coverUrl ? (
                      <Image
                        source={{ uri: item.coverUrl }}
                        style={styles.resultCover}
                      />
                    ) : (
                      <View style={[styles.resultCover, styles.resultCoverPlaceholder]}>
                        <Text>🎵</Text>
                      </View>
                    )}
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.resultArtist} numberOfLines={1}>
                        {item.artist}
                      </Text>
                    </View>
                  </Pressable>
                )}
                ListEmptyComponent={
                  query.trim() && !searching ? (
                    <Text style={styles.emptyText}>
                      找不到結果，試試其他關鍵字
                    </Text>
                  ) : null
                }
              />
            )}
          </>
        )}
      </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...layout.screen,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: 14,
    paddingTop: spacing.xs,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.md,
  },
  searchButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  loader: {
    marginTop: spacing.xxl,
  },

  // Results
  resultsList: {
    paddingHorizontal: spacing.xl,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultCover: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  resultCoverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  resultTitle: {
    ...typo.bodyBold,
    marginBottom: 2,
  },
  resultArtist: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },

  // Selected track
  selectedContainer: {
    paddingHorizontal: spacing.xl,
    flex: 1,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  selectedCover: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  selectedInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  selectedArtist: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  changeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changeText: {
    color: colors.textSecondary,
    fontSize: 12,
  },

  // Reason input
  reasonInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.textHint,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },

  // Submit
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bonusText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.spotify,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
