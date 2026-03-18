import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import type { FeedbackReaction, FeedbackInsight } from '../../../packages/shared/types';
import TasteRadar from './TasteRadar';

interface FeedbackSheetProps {
  visible: boolean;
  cardId: string;
  tasteDistance: number;
  onSubmit: (reaction: FeedbackReaction, comment?: string) => Promise<FeedbackInsight | null | void>;
  onClose: () => void;
  onSharePress?: () => void;
}

const REACTIONS: { key: FeedbackReaction; emoji: string; label: string; color: string }[] = [
  { key: 'surprised', emoji: '🤯', label: '驚喜', color: '#6C5CE7' },
  { key: 'okay', emoji: '😐', label: '普通', color: '#8E8E93' },
  { key: 'not_for_me', emoji: '🙅', label: '不適合', color: '#3A3A4E' },
];

export default function FeedbackSheet({
  visible,
  cardId: _cardId,
  tasteDistance,
  onSubmit,
  onClose,
  onSharePress,
}: FeedbackSheetProps) {
  const [selectedReaction, setSelectedReaction] = useState<FeedbackReaction | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [insight, setInsight] = useState<FeedbackInsight | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedReaction(null);
      setComment('');
      setSubmitted(false);
      setSubmitError(null);
      setSubmitting(false);
      setInsight(null);
    }
  }, [visible]);

  const tastePercent = Math.round(tasteDistance * 100);

  const handleSubmit = async () => {
    if (!selectedReaction || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await onSubmit(selectedReaction, comment.trim() || undefined);
      if (result && 'oldVector' in result) {
        setInsight(result as FeedbackInsight);
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Determine if this was a "surprised" reaction
  const isSurprised = selectedReaction === 'surprised';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {submitted ? (
            // Post-submit: micro-insight visualization
            <View style={styles.submittedContainer}>
              {isSurprised ? (
                // Special "surprised" celebration
                <>
                  <Text style={styles.celebrationEmoji}>🎉</Text>
                  <Text style={styles.submittedTitle}>新領域解鎖！</Text>
                  {insight?.dominantShift && (
                    <Text style={styles.shiftHighlight}>
                      你在 {insight.dominantShift.label} 區域踏出了新的一步
                    </Text>
                  )}
                </>
              ) : (
                // Normal feedback
                <>
                  <Text style={styles.submittedEmoji}>✨</Text>
                  <Text style={styles.submittedTitle}>
                    {insight ? '你的品味地圖剛剛擴展了！' : '感謝你的回饋！'}
                  </Text>
                </>
              )}

              {/* Radar chart: before/after */}
              {insight && insight.oldVector.length > 0 && (
                <View style={styles.radarContainer}>
                  <TasteRadar
                    tasteVector={insight.newVector}
                    beforeVector={insight.oldVector}
                    size={160}
                    mini
                  />
                </View>
              )}

              {/* Dominant shift indicator */}
              {insight?.dominantShift && !isSurprised && (
                <View style={styles.shiftRow}>
                  <Text style={styles.shiftGenre}>{insight.dominantShift.label}</Text>
                  <Text style={[
                    styles.shiftChange,
                    { color: insight.dominantShift.change > 0 ? '#2ECC71' : '#E74C3C' }
                  ]}>
                    {insight.dominantShift.change > 0 ? '+' : ''}{insight.dominantShift.change}
                    {insight.dominantShift.change > 0 ? ' ↑' : ' ↓'}
                  </Text>
                </View>
              )}

              {/* Genres explored count */}
              {insight && insight.genresExplored > 0 && (
                <Text style={styles.exploredText}>
                  已探索 {insight.genresExplored} 個品味區域
                </Text>
              )}

              {/* Fallback: taste distance bar (when no insight data) */}
              {!insight && (
                <View style={styles.distanceContainer}>
                  <Text style={styles.distanceLabel}>品味距離</Text>
                  <View style={styles.distanceBarBg}>
                    <View
                      style={[styles.distanceBarFill, { width: `${tastePercent}%` }]}
                    />
                  </View>
                  <Text style={styles.distanceValue}>{tastePercent}%</Text>
                </View>
              )}

              <Text style={styles.distanceHint}>
                {tastePercent > 60
                  ? '這是一次大膽的品味冒險！'
                  : tastePercent > 30
                    ? '有點跳脫，但不至於排斥'
                    : '跟你的品味蠻接近的'}
              </Text>

              {/* Share button */}
              {onSharePress && (
                <Pressable style={styles.shareButton} onPress={onSharePress}>
                  <Text style={styles.shareButtonText}>分享到社群</Text>
                </Pressable>
              )}

              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>完成</Text>
              </Pressable>
            </View>
          ) : (
            // Pre-submit: reaction selection
            <>
              <Text style={styles.title}>你覺得這首歌如何？</Text>

              {/* Reaction buttons */}
              <View style={styles.reactionsRow}>
                {REACTIONS.map((r) => (
                  <Pressable
                    key={r.key}
                    style={[
                      styles.reactionButton,
                      {
                        backgroundColor:
                          selectedReaction === r.key
                            ? r.color
                            : 'rgba(255,255,255,0.08)',
                        borderColor:
                          selectedReaction === r.key
                            ? r.color
                            : 'rgba(255,255,255,0.12)',
                      },
                    ]}
                    onPress={() => setSelectedReaction(r.key)}
                  >
                    <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                    <Text
                      style={[
                        styles.reactionLabel,
                        selectedReaction === r.key && styles.reactionLabelActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Comment input */}
              <TextInput
                style={styles.commentInput}
                placeholder="想說點什麼？"
                placeholderTextColor="#666"
                value={comment}
                onChangeText={setComment}
                maxLength={100}
                multiline
                numberOfLines={2}
              />
              <Text style={styles.charCount}>{comment.length}/100</Text>

              {/* Error message */}
              {submitError && (
                <Text style={styles.errorText}>{submitError}</Text>
              )}

              {/* Submit button */}
              <Pressable
                style={[
                  styles.submitButton,
                  (!selectedReaction || submitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!selectedReaction || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>送出回饋</Text>
                )}
              </Pressable>

              {/* Dismiss */}
              <Pressable style={styles.dismissButton} onPress={handleClose}>
                <Text style={styles.dismissText}>取消</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },

  // Reaction buttons
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  reactionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 36, marginBottom: 8 },
  reactionLabel: { fontSize: 14, color: '#8E8E93', fontWeight: '600' },
  reactionLabelActive: { color: '#FFFFFF' },

  // Comment
  commentInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },

  // Submit
  submitButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  errorText: {
    color: '#E74C3C',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },

  dismissButton: { alignItems: 'center', paddingVertical: 8 },
  dismissText: { color: '#8E8E93', fontSize: 14 },

  // Submitted state — micro-insight
  submittedContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  submittedEmoji: { fontSize: 48, marginBottom: 12 },
  celebrationEmoji: { fontSize: 56, marginBottom: 12 },
  submittedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  shiftHighlight: {
    fontSize: 15,
    color: '#6C5CE7',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },

  // Radar
  radarContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },

  // Shift indicator
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftGenre: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 8,
  },
  shiftChange: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Explored count
  exploredText: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 20,
  },

  // Fallback distance bar
  distanceContainer: {
    width: '100%',
    marginBottom: 12,
  },
  distanceLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  distanceBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distanceBarFill: {
    height: '100%',
    backgroundColor: '#6C5CE7',
    borderRadius: 4,
  },
  distanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6C5CE7',
    textAlign: 'right',
    marginTop: 8,
  },

  distanceHint: {
    fontSize: 14,
    color: '#BBBBBB',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },

  shareButton: {
    backgroundColor: 'rgba(108,92,231,0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6C5CE7',
    marginBottom: 12,
  },
  shareButtonText: { color: '#6C5CE7', fontSize: 16, fontWeight: '700' },

  closeButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  closeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
