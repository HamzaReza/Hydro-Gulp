import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, FontSize } from '../../constants/theme';
import { DRINK_TYPES } from '../../constants/drinks';

interface DonutSegment {
  type: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
}

const polarToCartesian = (
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
};

const describeArc = (
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
};

export const DonutChart: React.FC<DonutChartProps> = ({
  segments,
  size = 180,
  strokeWidth = 28,
  centerLabel,
}) => {
  const theme = useTheme();
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={theme.progressBackground}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>
        <View style={styles.center}>
          <Text style={[styles.centerText, { color: theme.textSecondary }]}>No data</Text>
        </View>
      </View>
    );
  }

  let currentAngle = 0;
  const paths = segments
    .filter((s) => s.value > 0)
    .map((segment) => {
      const angle = (segment.value / total) * 360;
      const path = describeArc(cx, cy, r, currentAngle, currentAngle + angle - 1);
      currentAngle += angle;
      return { ...segment, path, angle };
    });

  return (
    <View>
      <View style={[styles.container, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={theme.progressBackground}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {paths.map((p) => (
            <Path
              key={p.type}
              d={p.path}
              stroke={p.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </Svg>
        {centerLabel && (
          <View style={styles.center}>
            <Text style={[styles.centerText, { color: theme.text }]}>{centerLabel}</Text>
            <Text style={[styles.centerSub, { color: theme.textSecondary }]}>total</Text>
          </View>
        )}
      </View>

      <View style={styles.legend}>
        {segments.filter((s) => s.value > 0).map((s) => {
          const drink = DRINK_TYPES.find((d) => d.id === s.type);
          const percent = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <View key={s.type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                {drink?.label || s.type}: {percent}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  centerText: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
  },
  centerSub: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.light,
  },
  legend: {
    marginTop: 12,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
  },
});
