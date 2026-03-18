import React, { useEffect } from 'react';
import { TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// AnimatedTextInput approach for performant number animation on the UI thread
import { TextInput, StyleSheet } from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface CountingNumberProps {
  value: number;
  duration?: number;
  style?: TextStyle;
}

export default function CountingNumber({
  value,
  duration = 800,
  style,
}: CountingNumberProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration, animatedValue]);

  const animatedProps = useAnimatedProps(() => {
    const text = `${Math.round(animatedValue.value)}`;
    return {
      text,
      // defaultValue is needed for Android
      defaultValue: text,
    };
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      style={[styles.text, style]}
      animatedProps={animatedProps}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    // Reset TextInput padding so it behaves like Text
    padding: 0,
    margin: 0,
  },
});
