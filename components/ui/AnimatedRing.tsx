import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { Colors, FontSize } from '../../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedRingProps {
  progress: number; // 0–100
  size?: number;
  strokeWidth?: number;
  currentAmount: number;
  goal: number;
  unit: 'ml' | 'oz';
  formatAmount: (val: number) => string;
}

export const AnimatedRing: React.FC<AnimatedRingProps> = ({
  progress,
  size = 240,
  strokeWidth = 18,
  currentAmount,
  goal,
  unit,
  formatAmount,
}) => {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withSpring(Math.min(progress / 100, 1), {
      damping: 15,
      stiffness: 80,
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset,
    };
  });

  const percent = Math.round(progress);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={Colors.mediumBlue} />
            <Stop offset="100%" stopColor={Colors.lightBlue} />
          </SvgGradient>
        </Defs>
        {/* Track circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.progressBackground}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>

      <View style={styles.centerContent}>
        <Text
          style={[styles.amountText, { color: theme.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatAmount(currentAmount)}
        </Text>
        <Text style={[styles.percentText, { color: theme.textSecondary }]}>
          {percent}% of goal
        </Text>
        <Text style={[styles.goalText, { color: theme.textSecondary }]}>
          Goal: {formatAmount(goal)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  amountText: {
    fontSize: FontSize.hero,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -2,
    textAlign: 'center',
  },
  percentText: {
    fontSize: FontSize.md,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  goalText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_300Light',
    marginTop: 2,
  },
});
