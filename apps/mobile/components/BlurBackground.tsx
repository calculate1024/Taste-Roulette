import React from 'react';
import { View, Image, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/theme';

interface BlurBackgroundProps {
  imageUrl: string | null;
  fallbackColor?: string;
}

export default function BlurBackground({
  imageUrl,
  fallbackColor = colors.bg,
}: BlurBackgroundProps) {
  const { width, height } = useWindowDimensions();

  if (!imageUrl) {
    return (
      <View
        style={[styles.container, { backgroundColor: fallbackColor }]}
        pointerEvents="none"
      />
    );
  }

  // Scale up 1.3x so blur edges don't show the image boundary
  const scaledWidth = width * 1.3;
  const scaledHeight = height * 1.3;
  const offsetX = (scaledWidth - width) / -2;
  const offsetY = (scaledHeight - height) / -2;

  return (
    <View style={styles.container} pointerEvents="none">
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.image,
          {
            width: scaledWidth,
            height: scaledHeight,
            left: offsetX,
            top: offsetY,
          },
        ]}
        blurRadius={25}
        resizeMode="cover"
        // GPU acceleration hints for low-end devices
        {...(Platform.OS === 'android' && { renderToHardwareTextureAndroid: true })}
      />
      <LinearGradient
        colors={[
          'transparent',
          'rgba(15,15,26,0.7)',
          'rgba(15,15,26,0.95)',
        ]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
});
