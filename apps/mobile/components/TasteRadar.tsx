import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle } from 'react-native-svg';

// Full genre list matching CLAUDE.md order
// 0:pop, 1:rock, 2:hip-hop, 3:r&b, 4:jazz, 5:classical, 6:electronic,
// 7:latin, 8:country, 9:folk, 10:metal, 11:punk, 12:indie, 13:soul,
// 14:blues, 15:reggae, 16:world, 17:ambient, 18:k-pop, 19:j-pop, 20:c-pop

const GENRE_CATEGORIES_MAPPED = [
  { label: 'Pop/R&B', indices: [0, 3, 18, 19, 20] },
  { label: 'Rock/Metal', indices: [1, 10, 11, 12] },
  { label: 'Hip-Hop/Soul', indices: [2, 13, 14] },
  { label: 'Electronic', indices: [6, 17] },
  { label: 'Jazz/Classical', indices: [4, 5] },
  { label: 'World/Folk', indices: [7, 8, 9, 15, 16] },
];

interface TasteRadarProps {
  tasteVector: number[];
  size?: number;
  mini?: boolean;
  beforeVector?: number[];
}

/** Compute category values from a 21-dim taste vector. */
function computeCategoryValues(vector: number[]): number[] {
  return GENRE_CATEGORIES_MAPPED.map((cat) => {
    if (!vector || vector.length === 0) return 0;
    const vals = cat.indices
      .filter((i) => i < vector.length)
      .map((i) => vector[i]);
    if (vals.length === 0) return 0;
    return vals.reduce((sum, v) => sum + v, 0) / vals.length;
  });
}

/**
 * Radar/spider chart showing user's taste profile across genre categories.
 * Groups 21-dim taste vector into 6 categories by averaging.
 *
 * - mini: compact mode for inline display (no labels, smaller)
 * - beforeVector: show a "before" overlay polygon for comparison
 */
export default function TasteRadar({
  tasteVector,
  size: sizeProp,
  mini = false,
  beforeVector,
}: TasteRadarProps) {
  const size = sizeProp ?? (mini ? 160 : 280);
  const categories = GENRE_CATEGORIES_MAPPED;
  const numAxes = categories.length;
  const center = size / 2;
  const maxRadius = size * 0.35;
  const labelOffset = size * 0.45;
  const rings = [0.33, 0.66, 1.0];

  // Current vector
  const categoryValues = computeCategoryValues(tasteVector);

  // Before vector (optional)
  const beforeCategoryValues = beforeVector ? computeCategoryValues(beforeVector) : null;

  // Normalize: use max across both vectors for consistent scale
  const allValues = beforeCategoryValues
    ? [...categoryValues, ...beforeCategoryValues]
    : categoryValues;
  const maxVal = Math.max(...allValues, 0.001);
  const normalized = categoryValues.map((v) => Math.max(0, v) / maxVal);
  const beforeNormalized = beforeCategoryValues
    ? beforeCategoryValues.map((v) => Math.max(0, v) / maxVal)
    : null;

  const getPoint = (index: number, radius: number): { x: number; y: number } => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  };

  const buildPolygonPoints = (values: number[]): string =>
    values
      .map((val, i) => {
        const p = getPoint(i, val * maxRadius);
        return `${p.x},${p.y}`;
      })
      .join(' ');

  const dataPoints = buildPolygonPoints(normalized);
  const beforeDataPoints = beforeNormalized ? buildPolygonPoints(beforeNormalized) : null;

  const ringPoints = (ringScale: number) =>
    Array.from({ length: numAxes })
      .map((_, i) => {
        const p = getPoint(i, ringScale * maxRadius);
        return `${p.x},${p.y}`;
      })
      .join(' ');

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
            strokeWidth={mini ? 0.5 : 1}
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
              strokeWidth={mini ? 0.5 : 1}
            />
          );
        })}

        {/* Before polygon (gray, underneath) */}
        {beforeDataPoints && (
          <Polygon
            points={beforeDataPoints}
            fill="rgba(142,142,147,0.15)"
            stroke="#8E8E93"
            strokeWidth={1}
            strokeDasharray="4,3"
          />
        )}

        {/* Data polygon (current) */}
        <Polygon
          points={dataPoints}
          fill="rgba(108,92,231,0.3)"
          stroke="#6C5CE7"
          strokeWidth={mini ? 1.5 : 2}
        />

        {/* Data points */}
        {!mini && normalized.map((val, i) => {
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
        <Circle cx={center} cy={center} r={mini ? 1.5 : 2} fill="rgba(255,255,255,0.3)" />
      </Svg>

      {/* Labels (hidden in mini mode) */}
      {!mini && labelPositions.map((pos, i) => (
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
