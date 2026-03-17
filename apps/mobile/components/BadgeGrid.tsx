import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { UserStats } from '../../../packages/shared/types';

// Badge definition
interface BadgeDef {
  id: string;
  icon: string;
  title: string;
  description: string;
  condition: (stats: UserStats) => boolean;
}

const BADGES: BadgeDef[] = [
  {
    id: 'first_surprise',
    icon: '\u{1F92F}',
    title: '\u7B2C\u4E00\u500B\u9A5A\u559C',
    description: '\u9996\u6B21\u7372\u5F97\u300C\u9A5A\u559C\u300D\u56DE\u994B',
    condition: (stats) => stats.surprisedCount >= 1,
  },
  {
    id: 'explorer_5',
    icon: '\u{1F9ED}',
    title: '\u985E\u578B\u63A2\u7D22\u5BB6',
    description: '\u63A2\u7D22\u4E86 5 \u500B\u4E0D\u540C\u985E\u578B',
    condition: (stats) => stats.genresExplored >= 5,
  },
  {
    id: 'streak_7',
    icon: '\u{1F525}',
    title: '\u9023\u7E8C 7 \u5929',
    description: '\u9023\u7E8C 7 \u5929\u958B\u555F\u63A8\u85A6',
    condition: (stats) => stats.streakCount >= 7,
  },
  {
    id: 'streak_30',
    icon: '\u{1F48E}',
    title: '\u947D\u77F3\u73A9\u5BB6',
    description: '\u9023\u7E8C 30 \u5929',
    condition: (stats) => stats.streakCount >= 30,
  },
  {
    id: 'recommender',
    icon: '\u{1F3B5}',
    title: '\u63A8\u85A6\u9054\u4EBA',
    description: '\u63A8\u85A6\u4E86 10 \u9996\u6B4C',
    condition: (stats) => stats.totalRecommendations >= 10,
  },
  {
    id: 'far_reach',
    icon: '\u{1F30D}',
    title: '\u6700\u9060\u8DDD\u96E2',
    description: '\u54C1\u5473\u8DDD\u96E2\u8D85\u904E 80%',
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
              {badge.title}
            </Text>
            <Text
              style={[styles.badgeDesc, !earned && styles.badgeDescLocked]}
              numberOfLines={2}
            >
              {badge.description}
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
