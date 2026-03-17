import { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

interface ShareCardProps {
  track: { title: string; artist: string; coverUrl: string };
  tasteDistance: number;
  onShare: (uri: string) => void;
  onClose: () => void;
}

export default function ShareCard({
  track,
  tasteDistance,
  onShare,
  onClose,
}: ShareCardProps) {
  const viewShotRef = useRef<ViewShot>(null);
  const tastePercent = Math.round(tasteDistance * 100);

  const handleShare = useCallback(async () => {
    if (!viewShotRef.current?.capture) return;
    try {
      const uri = await viewShotRef.current.capture();
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        onShare(uri);
      }
    } catch {
      // Capture or sharing failed silently
    }
  }, [onShare]);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Captured card area */}
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1, width: 1080, height: 1920 }}
            style={styles.viewShot}
          >
            <View style={styles.cardBackground}>
              {/* Gradient simulation with layered views */}
              <View style={styles.gradientTop} />
              <View style={styles.gradientBottom} />

              {/* Card content */}
              <View style={styles.cardContent}>
                {/* Top spacer */}
                <View style={styles.topSpacer} />

                {/* Cover image */}
                {track.coverUrl ? (
                  <Image
                    source={{ uri: track.coverUrl }}
                    style={styles.coverImage}
                  />
                ) : (
                  <View style={[styles.coverImage, styles.coverPlaceholder]}>
                    <Text style={styles.coverPlaceholderText}>🎵</Text>
                  </View>
                )}

                {/* Track info */}
                <Text style={styles.trackTitle} numberOfLines={2}>
                  {track.title}
                </Text>
                <Text style={styles.trackArtist} numberOfLines={1}>
                  {track.artist}
                </Text>

                {/* Taste distance message */}
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>
                    有人推薦了一首跟我品味距離 {tastePercent}% 的歌
                  </Text>
                </View>

                {/* Bottom branding */}
                <View style={styles.branding}>
                  <Text style={styles.brandingIcon}>🎲</Text>
                  <Text style={styles.brandingText}>Taste Roulette</Text>
                  <Text style={styles.brandingTagline}>
                    走出品味舒適圈
                  </Text>
                </View>
              </View>
            </View>
          </ViewShot>

          {/* Action buttons (not captured) */}
          <View style={styles.actions}>
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>分享到社群</Text>
            </Pressable>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>關閉</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
  },

  // ViewShot wrapper — displays at screen size, captures at 1080x1920
  viewShot: {
    width: '100%',
    aspectRatio: 1080 / 1920,
    borderRadius: 16,
    overflow: 'hidden',
  },

  // Background with gradient simulation
  cardBackground: {
    flex: 1,
    backgroundColor: '#0F0F1A',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#2D1B69',
    opacity: 0.6,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: '#0A1628',
    opacity: 0.5,
  },

  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  topSpacer: {
    flex: 1,
  },

  // Cover image
  coverImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
    backgroundColor: '#2A2A3E',
    marginBottom: 24,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    fontSize: 48,
  },

  // Track info
  trackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  trackArtist: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },

  // Taste distance
  distanceBadge: {
    backgroundColor: 'rgba(108,92,231,0.25)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 24,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B8ADFF',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Branding
  branding: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 32,
  },
  brandingIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  brandingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6C5CE7',
    marginBottom: 4,
  },
  brandingTagline: {
    fontSize: 12,
    color: '#8E8E93',
  },

  // Actions (outside captured area)
  actions: {
    width: '100%',
    marginTop: 20,
  },
  shareButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#8E8E93',
    fontSize: 14,
  },
});
