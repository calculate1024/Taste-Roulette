import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '../constants/theme';

const PARTICLE_COUNT = 14;
const ANIMATION_DURATION = 1500;

// Confetti color palette
const PARTICLE_COLORS = [
  colors.accent,       // purple
  colors.accentLight,  // light purple
  '#FFD700',           // gold
  '#FF69B4',           // pink
  '#00CED1',           // cyan
  colors.surprised,    // coral/red
];

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}

interface ConfettiEffectProps {
  active: boolean;
}

function ConfettiParticle({
  particle,
  trigger,
}: {
  particle: Particle;
  trigger: number;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (trigger === 0) return;

    // Reset
    scale.value = 0;
    opacity.value = 0;
    translateY.value = 0;

    // Animate: scale up, then fade out while drifting
    scale.value = withDelay(
      particle.delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.back(2)) })
    );
    opacity.value = withDelay(
      particle.delay,
      withTiming(1, { duration: 200 }, () => {
        // After appearing, fade out
        opacity.value = withDelay(
          400,
          withTiming(0, { duration: 800, easing: Easing.in(Easing.ease) })
        );
      })
    );
    translateY.value = withDelay(
      particle.delay,
      withTiming(-30 - Math.random() * 40, {
        duration: ANIMATION_DURATION - particle.delay,
        easing: Easing.out(Easing.ease),
      })
    );
  }, [trigger, particle.delay, scale, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function ConfettiEffect({ active }: ConfettiEffectProps) {
  const { width, height } = useWindowDimensions();
  const triggerCount = useRef(0);
  const [trigger, setTrigger] = React.useState(0);
  const [particles, setParticles] = React.useState<Particle[]>([]);

  const generateParticles = useCallback((): Particle[] => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * (width * 0.8) + width * 0.1,
      y: Math.random() * (height * 0.4) + height * 0.2,
      size: 4 + Math.random() * 4, // 4-8px
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      delay: Math.random() * 300,
    }));
  }, [width, height]);

  useEffect(() => {
    if (active) {
      triggerCount.current += 1;
      setParticles(generateParticles());
      setTrigger(triggerCount.current);
    }
  }, [active, generateParticles]);

  if (trigger === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle, i) => (
        <ConfettiParticle key={i} particle={particle} trigger={trigger} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
  },
});
