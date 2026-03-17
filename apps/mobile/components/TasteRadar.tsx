import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle, G } from 'react-native-svg';

// Full genre list matching CLAUDE.md order
// 0:pop, 1:rock, 2:hip-hop, 3:r&b, 4:jazz, 5:classical, 6:electronic,
// 7:latin, 8:country, 9:folk, 10:metal, 11:punk, 12:indie, 13:soul,
// 14:blues, 15:reggae, 16:world, 17:ambient, 18:k-pop, 19:j-pop

// Remap indices to match the actual genre order from CLAUDE.md
const GENRE_CATEGORIES_MAPPED = [
  { label: 'Pop/R&B', indices: [0, 3, 18, 19] },
  { label: 'Rock/Metal', indices: [1, 10, 11, 12] },
  { label: 'Hip-Hop/Soul', indices: [2, 13, 14] },
  { label: 'Electronic', indices: [6, 17] },
  { label: 'Jazz/Classical', indices: [4, 5] },
  { label: 'World/Folk', indices: [7, 8, 9, 15, 16] },
];

interface TasteRadarProps {
  tasteVector: number[];
  size?: number;
}

/**
 * Radar/spider chart showing user's taste profile across genre categories.
 * Groups 20-dim taste vector into 6 categories by averaging.
 */
export default function TasteRadar({ tasteVector, size = 280 }: TasteRadarProps) {
  const categories = GENRE_CATEGORIES_MAPPED;
  const numAxes = categories.length;
  const center = size / 2;
  const maxRadius = size * 0.35;
  const labelOffset = size * 0.45;
  const rings = [0.33, 0.66, 1.0];

  // Group taste vector into categories by averaging
  const categoryValues = categories.map((cat) => {
    if (!tasteVector || tasteVector.length === 0) return 0;
    const vals = cat.indices
      .filter((i) => i < tasteVector.length)
      .map((i) => tasteVector[i]);
    if (vals.length === 0) return 0;
    return vals.reduce((sum, v) => sum + v, 0) / vals.length;
  });

  // Normalize to 0-1 range
  const maxVal = Math.max(...categoryValues, 0.001);
  const normalized = categoryValues.map((v) => Math.max(0, v) / maxVal);

  // Calculate point positions for a given radius multiplier
  const getPoint = (index: number, radius: number): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  };

  // Build polygon points string for data
  const dataPoints = normalized
    .map((val, i) => {
      const p = getPoint(i, val * maxRadius);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  // Build ring polygon points
  const ringPoints = (ringScale: number) =>
    Array.from({ length: numAxes })
      .map((_, i) => {
        const p = getPoint(i, ringScale * maxRadius);
        return `${p.x},${p.y}`;
      })
      .join(' ');

  // Label positions
  const labelPositions = categories.map((cat, i) => {
    const p = getPoint(i, labelOffset);
    return { ...p, label: cat.label };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((scale) => (
          <Polygon
            key={`ring-${scale}`}
            points={ringPoints(scale)}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        ))}

        {/* Axis lines */}
        {Array.from({ length: numAxes }).map((_, i) => {
          const p = getPoint(i, maxRadius);
          return (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon */}
        <Polygon
          points={dataPoints}
          fill="rgba(108,92,231,0.3)"
          stroke="#6C5CE7"
          strokeWidth={2}
        />

        {/* Data points */}
        {normalized.map((val, i) => {
          const p = getPoint(i, val * maxRadius);
          return (
            <Circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill="#6C5CE7"
            />
          );
        })}

        {/* Center dot */}
        <Circle cx={center} cy={center} r={2} fill="rgba(255,255,255,0.3)" />
      </Svg>

      {/* Labels positioned absolutely around the chart */}
      {labelPositions.map((pos, i) => (
        <Text
          key={`label-${i}`}
          style={[
            styles.label,
            {
              left: pos.x - 35,
              top: pos.y - 8,
            },
          ]}
        >
          {pos.label}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    width: 70,
  },
});
