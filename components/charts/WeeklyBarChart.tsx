import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Colors, FontSize } from '../../constants/theme';
import { getDayLabel } from '../../utils/dateUtils';

interface DayData {
  date: string;
  total: number;
}

interface WeeklyBarChartProps {
  data: DayData[];
  goal: number;
  width?: number;
  height?: number;
}

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({
  data,
  goal,
  width: propWidth,
  height = 160,
}) => {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const width = propWidth || screenWidth - 48;

  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 16;
  const paddingBottom = 32;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxValue = Math.max(goal * 1.2, ...data.map((d) => d.total), 100);
  const barWidth = chartWidth / data.length - 8;

  const goalY = paddingTop + chartHeight - (goal / maxValue) * chartHeight;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={Colors.lightBlue} stopOpacity="1" />
            <Stop offset="100%" stopColor={Colors.mediumBlue} stopOpacity="0.6" />
          </SvgGradient>
          <SvgGradient id="barGradientMet" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={Colors.lightBlue} stopOpacity="1" />
            <Stop offset="100%" stopColor={Colors.mediumBlue} stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Goal line */}
        <Line
          x1={paddingLeft}
          y1={goalY}
          x2={width - paddingRight}
          y2={goalY}
          stroke={theme.textSecondary}
          strokeWidth={1.5}
          strokeDasharray="6,4"
          opacity={0.6}
        />

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.total / maxValue) * chartHeight;
          const x = paddingLeft + index * (chartWidth / data.length) + 4;
          const y = paddingTop + chartHeight - barHeight;
          const metGoal = item.total >= goal;

          return (
            <React.Fragment key={item.date}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx={6}
                fill={metGoal ? 'url(#barGradientMet)' : 'url(#barGradient)'}
                opacity={item.total === 0 ? 0.2 : 1}
              />
              <SvgText
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize={10}
                fill={theme.textSecondary}
                fontFamily="Inter_400Regular"
              >
                {getDayLabel(item.date)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};
