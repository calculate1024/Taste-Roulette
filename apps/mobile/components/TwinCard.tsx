import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, radius } from '../constants/theme';

interface TwinCardProps {
  label: string;
  distance: number;
  type: 'twin' | 'complement';
  dominantGenres: string[];
}

// Genre display names for tags
const GENRE_DISPLAY: Record<string, string> = {
  'pop': 'Pop',
  'rock': 'Rock',
  'hip-hop': 'Hip-Hop',
  'r&b': 'R&B',
  'jazz': 'Jazz',
  'classical': 'Classical',
  'electronic': 'Electronic',
  'latin': 'Latin',
  'country': 'Country',
  'folk': 'Folk',
  'metal': 'Metal',
  'punk': 'Punk',
  'indie': 'Indie',
  'soul': 'Soul',
  'blues': 'Blues',
  'reggae': 'Reggae',
  'world': 'World',
  'ambient': 'Ambient',
  'k-pop': 'K-Pop',
  'j-pop': 'J-Pop',
};

export default function TwinCard({ label, distance, type, dominantGenres }: TwinCardProps) {
  const { t } = useTranslation();
  const isTwin = type === 'twin';
  const accentColor = isTwin ? '#00B894' : '#6C5CE7';

  // For twins: similarity = 1 - distance. For complements: complementarity = distance
  const percentage = isTwin
    ? Math.round((1 - distance) * 100)
    : Math.round(distance * 100);

  const percentLabel = isTwin ? t('twins.tasteSimilarity') : t('twins.tasteComplementarity');

  return (
    <View style={[styles.card, { borderColor: accentColor }]}>
      {/* Taste label */}
      <Text style={[styles.label, { color: accentColor }]}>{label}</Text>

      {/* Distance indicator */}
      <Text style={styles.distanceText}>
        {percentLabel} {percentage}%
      </Text>

      {/* Genre tags */}
      <View style={styles.tagsRow}>
        {dominantGenres.slice(0, 3).map((genre) => (
          <View key={genre} style={[styles.tag, { borderColor: accentColor }]}>
            <Text style={[styles.tagText, { color: accentColor }]}>
              {GENRE_DISPLAY[genre] || genre}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  distanceText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
