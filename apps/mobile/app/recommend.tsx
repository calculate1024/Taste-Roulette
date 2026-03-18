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
} from 'react-native-reanimated';
import { useAppStore } from '../store/appStore';
import { searchTracks, submitRecommendation } from '../services/api';
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
              placeholderTextColor="#666"
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
                <ActivityIndicator color="#FFFFFF" size="small" />
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
                placeholderTextColor="#666"
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
                color="#6C5CE7"
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  skipText: {
    color: '#8E8E93',
    fontSize: 14,
    paddingTop: 4,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 12,
  },
  searchButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  loader: {
    marginTop: 32,
  },

  // Results
  resultsList: {
    paddingHorizontal: 24,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  resultCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#2A2A3E',
  },
  resultCoverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  resultArtist: {
    fontSize: 14,
    color: '#8E8E93',
  },

  emptyText: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 32,
  },

  // Selected track
  selectedContainer: {
    paddingHorizontal: 24,
    flex: 1,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 24,
  },
  selectedCover: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#2A2A3E',
  },
  selectedInfo: {
    flex: 1,
    marginLeft: 16,
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  selectedArtist: {
    fontSize: 14,
    color: '#8E8E93',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  changeText: {
    color: '#8E8E93',
    fontSize: 12,
  },

  // Reason input
  reasonInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 24,
  },

  // Submit
  submitButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  bonusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1DB954',
    textAlign: 'center',
    marginTop: 16,
  },
});
