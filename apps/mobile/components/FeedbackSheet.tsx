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
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { FeedbackReaction, FeedbackInsight } from '../../../packages/shared/types';
import TasteRadar from './TasteRadar';
import ConfettiEffect from './ConfettiEffect';
import { colors, spacing, radius, typo, shadow } from '../constants/theme';

interface FeedbackSheetProps {
  visible: boolean;
  cardId: string;
  tasteDistance: number;
  onSubmit: (reaction: FeedbackReaction, comment?: string) => Promise<FeedbackInsight | null | void>;
  onClose: () => void;
  onSharePress?: () => void;
}

const REACTIONS: { key: FeedbackReaction; emoji: string; labelKey: string; color: string }[] = [
  { key: 'surprised', emoji: '🤯', labelKey: 'feedback.surprised', color: colors.accent },
  { key: 'okay', emoji: '😐', labelKey: 'feedback.okay', color: colors.textSecondary },
  { key: 'not_for_me', emoji: '🙅', labelKey: 'feedback.notForMe', color: '#3A3A4E' },
];

export default function FeedbackSheet({
  visible,
  cardId: _cardId,
  tasteDistance,
  onSubmit,
  onClose,
  onSharePress,
}: FeedbackSheetProps) {
  const { t } = useTranslation();
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
      setSubmitError(t('common.failedSubmitFeedback'));
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

          {/* Confetti for surprised reaction — active prop controls lifecycle */}
          <ConfettiEffect active={isSurprised && submitted} />

          {submitted ? (
            // Post-submit: micro-insight visualization
            <View style={styles.submittedContainer}>
              {isSurprised ? (
                // Special "surprised" celebration
                <>
                  <Text style={styles.celebrationEmoji}>🎉</Text>
                  <Text style={styles.submittedTitle}>{t('feedback.newAreaUnlocked')}</Text>
                  {insight?.dominantShift && (
                    <Text style={styles.shiftHighlight}>
                      {t('feedback.steppedInto', { label: insight.dominantShift.label })}
                    </Text>
                  )}
                </>
              ) : (
                // Normal feedback
                <>
                  <Text style={styles.submittedEmoji}>✨</Text>
                  <Text style={styles.submittedTitle}>
                    {insight ? t('feedback.tasteMapExpanded') : t('feedback.thankYouFeedback')}
                  </Text>
                </>
              )}

              {/* Radar chart: before/after */}
              {insight && insight.oldVector.length > 0 && (
                <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.radarContainer}>
                  <TasteRadar
                    tasteVector={insight.newVector}
                    beforeVector={insight.oldVector}
                    size={160}
                    mini
                  />
                </Animated.View>
              )}

              {/* Badge unlock animation */}
              {insight?.newBadge && (
                <Animated.View entering={FadeIn.delay(500).duration(600)} style={styles.badgeUnlock}>
                  <Text style={styles.badgeUnlockEmoji}>{insight.newBadge.emoji}</Text>
                  <Text style={styles.badgeUnlockTitle}>{t('feedback.newBadgeUnlocked')}</Text>
                  <Text style={styles.badgeUnlockLabel}>{insight.newBadge.label}</Text>
                </Animated.View>
              )}

              {/* Dominant shift indicator */}
              {insight?.dominantShift && !isSurprised && (
                <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.shiftRow}>
                  <Text style={styles.shiftGenre}>{insight.dominantShift.label}</Text>
                  <Text style={[
                    styles.shiftChange,
                    { color: insight.dominantShift.change > 0 ? colors.success : colors.error }
                  ]}>
                    {insight.dominantShift.change > 0 ? '+' : ''}{insight.dominantShift.change}
                    {insight.dominantShift.change > 0 ? ' ↑' : ' ↓'}
                  </Text>
                </Animated.View>
              )}

              {/* Genres explored count */}
              {insight && insight.genresExplored > 0 && (
                <Animated.View entering={FadeIn.delay(500).duration(400)}>
                  <Text style={styles.exploredText}>
                    {t('feedback.exploredAreas', { count: insight.genresExplored })}
                  </Text>
                </Animated.View>
              )}

              {/* Fallback: taste distance bar (when no insight data) */}
              {!insight && (
                <Animated.View entering={FadeIn.delay(300).duration(400)} style={styles.distanceContainer}>
                  <Text style={styles.distanceLabel}>{t('feedback.tasteDistance')}</Text>
                  <View style={styles.distanceBarBg}>
                    <View
                      style={[styles.distanceBarFill, { width: `${tastePercent}%` }]}
                    />
                  </View>
                  <Text style={styles.distanceValue}>{tastePercent}%</Text>
                </Animated.View>
              )}

              <Text style={styles.distanceHint}>
                {tastePercent > 60
                  ? t('feedback.boldAdventure')
                  : tastePercent > 30
                    ? t('feedback.aLittleOff')
                    : t('feedback.prettyClose')}
              </Text>

              {/* Share button */}
              {onSharePress && (
                <Pressable style={styles.shareButton} onPress={onSharePress}>
                  <Text style={styles.shareButtonText}>{t('feedback.shareToSocial')}</Text>
                </Pressable>
              )}

              <Pressable style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>{t('feedback.done')}</Text>
              </Pressable>
            </View>
          ) : (
            // Pre-submit: reaction selection
            <>
              <Text style={styles.title}>{t('feedback.howDoYouFeel')}</Text>

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
                            : colors.bgElevated,
                        borderColor:
                          selectedReaction === r.key
                            ? r.color
                            : colors.border,
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
                      {t(r.labelKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Comment input */}
              <TextInput
                style={styles.commentInput}
                placeholder={t('feedback.wantToSaySomething')}
                placeholderTextColor={colors.textSecondary}
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
                  <ActivityIndicator color={colors.textPrimary} size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('feedback.submitFeedback')}</Text>
                )}
              </Pressable>

              {/* Dismiss */}
              <Pressable style={styles.dismissButton} onPress={handleClose}>
                <Text style={styles.dismissText}>{t('feedback.cancel')}</Text>
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
    backgroundColor: colors.bgOverlay,
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    paddingTop: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.xl - 4,
  },

  title: {
    ...typo.heading,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // Reaction buttons
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  reactionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginHorizontal: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  reactionEmoji: { fontSize: 36, marginBottom: spacing.sm },
  reactionLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  reactionLabelActive: { color: colors.textPrimary },

  // Comment
  commentInput: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.xl - 4,
  },

  // Submit
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },

  errorText: {
    ...typo.caption,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  dismissButton: { alignItems: 'center', paddingVertical: spacing.sm },
  dismissText: { color: colors.textSecondary, fontSize: 14 },

  // Submitted state — micro-insight
  submittedContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  submittedEmoji: { fontSize: 48, marginBottom: spacing.md },
  celebrationEmoji: { fontSize: 56, marginBottom: spacing.md },
  submittedTitle: {
    ...typo.heading,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  shiftHighlight: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // Radar
  radarContainer: {
    marginVertical: spacing.lg,
    alignItems: 'center',
  },

  // Shift indicator
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  shiftGenre: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  shiftChange: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Explored count
  exploredText: {
    ...typo.caption,
    marginBottom: spacing.xl - 4,
  },

  // Fallback distance bar
  distanceContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  distanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  distanceBarBg: {
    height: 8,
    backgroundColor: colors.bgElevated,
    borderRadius: spacing.xs,
    overflow: 'hidden',
  },
  distanceBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: spacing.xs,
  },
  distanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent,
    textAlign: 'right',
    marginTop: spacing.sm,
  },

  distanceHint: {
    fontSize: 14,
    color: colors.textHint,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },

  shareButton: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: spacing.md,
  },
  shareButtonText: { color: colors.accent, fontSize: 16, fontWeight: '700' },

  closeButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxxl,
    alignItems: 'center',
  },
  closeButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },

  // Badge unlock
  badgeUnlock: {
    alignItems: 'center',
    backgroundColor: colors.accentDim,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.3)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    marginVertical: spacing.md,
  },
  badgeUnlockEmoji: { fontSize: 40, marginBottom: spacing.sm },
  badgeUnlockTitle: { color: colors.accent, fontSize: 14, fontWeight: '700', marginBottom: spacing.xs },
  badgeUnlockLabel: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
});
