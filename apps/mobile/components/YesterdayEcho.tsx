import { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeInDown,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { YesterdayEcho } from '../services/api';

interface YesterdayEchoProps {
  echo: YesterdayEcho;
  onDismiss: () => void;
}

/**
 * Animated toast showing that user's recommendation was appreciated yesterday.
 * Auto-dismisses after 5 seconds.
 */
export default function YesterdayEchoToast({ echo, onDismiss }: YesterdayEchoProps) {
  const { t } = useTranslation();
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    opacity.value = withDelay(5000, withTiming(0, { duration: 400 }));
    const timer = setTimeout(onDismiss, 5500);
    return () => clearTimeout(timer);
  }, [opacity, onDismiss]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View entering={FadeInDown.duration(500)} style={[styles.container, fadeStyle]}>
      <Pressable style={styles.inner} onPress={onDismiss}>
        {echo.coverUrl && (
          <Image source={{ uri: echo.coverUrl }} style={styles.cover} />
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            🎉 {t('yesterdayEcho.yourRecommendationHadImpact')}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {t('yesterdayEcho.trackSurprised', { title: echo.trackTitle, label: echo.recipientTasteLabel })}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108,92,231,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.3)',
    padding: 12,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#2A2A3E',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#6C5CE7',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  body: {
    color: '#BBBBBB',
    fontSize: 12,
    lineHeight: 16,
  },
});
