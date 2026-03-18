import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { UserStats } from '../../../packages/shared/types';

// Badge definition
interface BadgeDef {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  condition: (stats: UserStats) => boolean;
}

const BADGES: BadgeDef[] = [
  {
    id: 'first_surprise',
    icon: '\u{1F92F}',
    titleKey: 'badges.firstSurprise',
    descKey: 'badges.firstSurpriseDesc',
    condition: (stats) => stats.surprisedCount >= 1,
  },
  {
    id: 'explorer_5',
    icon: '\u{1F9ED}',
    titleKey: 'badges.genreExplorer',
    descKey: 'badges.genreExplorerDesc',
    condition: (stats) => stats.genresExplored >= 5,
  },
  {
    id: 'streak_7',
    icon: '\u{1F525}',
    titleKey: 'badges.streak7',
    descKey: 'badges.streak7Desc',
    condition: (stats) => stats.streakCount >= 7,
  },
  {
    id: 'streak_30',
    icon: '\u{1F48E}',
    titleKey: 'badges.diamondPlayer',
    descKey: 'badges.diamondPlayerDesc',
    condition: (stats) => stats.streakCount >= 30,
  },
  {
    id: 'recommender',
    icon: '\u{1F3B5}',
    titleKey: 'badges.recommendExpert',
    descKey: 'badges.recommendExpertDesc',
    condition: (stats) => stats.totalRecommendations >= 10,
  },
  {
    id: 'far_reach',
    icon: '\u{1F30D}',
    titleKey: 'badges.furthestReach',
    descKey: 'badges.furthestReachDesc',
    condition: (stats) => stats.maxTasteDistance >= 0.8,
  },
];

interface BadgeGridProps {
  stats: UserStats;
}

/**
 * Display earned and unearned badges in a 3-column grid.
 */
export default function BadgeGrid({ stats }: BadgeGridProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.grid}>
      {BADGES.map((badge) => {
        const earned = badge.condition(stats);
        return (
          <View
            key={badge.id}
            style={[styles.badgeCard, !earned && styles.badgeCardLocked]}
          >
            <Text style={styles.badgeIcon}>
              {earned ? badge.icon : '\u{1F512}'}
            </Text>
            <Text
              style={[styles.badgeTitle, !earned && styles.badgeTitleLocked]}
              numberOfLines={1}
            >
              {t(badge.titleKey)}
            </Text>
            <Text
              style={[styles.badgeDesc, !earned && styles.badgeDescLocked]}
              numberOfLines={2}
            >
              {t(badge.descKey)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '31%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeCardLocked: {
    opacity: 0.4,
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  badgeTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeTitleLocked: {
    color: '#8E8E93',
  },
  badgeDesc: {
    color: '#8E8E93',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  badgeDescLocked: {
    color: '#555',
  },
});
