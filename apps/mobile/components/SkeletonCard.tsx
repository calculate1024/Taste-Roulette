import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors, radius } from '../constants/theme';

const SHIMMER_DURATION = 1200;
const BASE_COLOR = colors.bgCard;
const HIGHLIGHT_COLOR = 'rgba(255,255,255,0.06)';

// Cover height matches RouletteCard's COVER_SIZE
const COVER_HEIGHT = 260;

function ShimmerBlock({
  width,
  height,
  borderRadius = 8,
  style,
  progress,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
  progress: { value: number };
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [BASE_COLOR, HIGHLIGHT_COLOR]
    );
    return { backgroundColor };
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export default function SkeletonCard() {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 48;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION, easing: Easing.inOut(Easing.ease) }),
      -1, // infinite
      true // reverse
    );
  }, [progress]);

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      {/* Cover image placeholder */}
      <ShimmerBlock
        width="100%"
        height={COVER_HEIGHT}
        borderRadius={0}
        progress={progress}
      />

      <View style={styles.content}>
        {/* Title bar */}
        <ShimmerBlock
          width="75%"
          height={24}
          borderRadius={6}
          progress={progress}
          style={styles.titleBar}
        />

        {/* Subtitle bar (artist) */}
        <ShimmerBlock
          width="50%"
          height={16}
          borderRadius={6}
          progress={progress}
          style={styles.subtitleBar}
        />

        {/* Reason bar */}
        <ShimmerBlock
          width="90%"
          height={14}
          borderRadius={6}
          progress={progress}
          style={styles.reasonBar}
        />
        <ShimmerBlock
          width="60%"
          height={14}
          borderRadius={6}
          progress={progress}
          style={styles.reasonBar}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center',
  },
  content: {
    padding: 20,
  },
  titleBar: {
    marginBottom: 12,
  },
  subtitleBar: {
    marginBottom: 16,
  },
  reasonBar: {
    marginBottom: 8,
  },
});
