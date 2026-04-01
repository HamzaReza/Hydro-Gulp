import React, { memo, useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  SharedValue,
  useAnimatedProps,
  useSharedValue,
  cancelAnimation,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { FontFamily, FontSize } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface DrinkBreakdown {
  type: string;
  amount: number;
  color: string;
}

interface AnimatedRingProps {
  progress: number; // 0–100
  size?: number;
  strokeWidth?: number;
  currentAmount: number;
  goal: number;
  unit: "ml" | "oz";
  formatAmount: (val: number) => string;
  drinkBreakdown?: DrinkBreakdown[];
}

// ─── Wavy arc (one drink segment) ───────────────────────────────────────────

interface WavyArcProps {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  startFraction: number;
  lengthFraction: number;
  color: string;
  /** Shared animated phase drives the water wave oscillation */
  phase: SharedValue<number>;
}

function WavyArc({
  cx,
  cy,
  radius,
  strokeWidth,
  startFraction,
  lengthFraction,
  color,
  phase,
}: WavyArcProps) {
  const animLen = useSharedValue(0);

  useEffect(() => {
    animLen.value = withSpring(lengthFraction, { damping: 15, stiffness: 80 });
  }, [lengthFraction]);

  // Number of radial waves around the full ring and their amplitude (px)
  const NUM_WAVES = 10;
  const AMPLITUDE = 2.8;
  const animatedProps = useAnimatedProps(() => {
    const len = animLen.value;
    if (len <= 0.001) return { d: "M 0,0" };

    const startAngle = -Math.PI / 2 + startFraction * 2 * Math.PI;
    const totalAngle = len * 2 * Math.PI;
    // More steps = smoother curve; scale with arc length
    const steps = Math.max(4, Math.round(90 * len));
    const phaseNow = phase.value;

    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const theta = startAngle + t * totalAngle;
      const r = radius + AMPLITUDE * Math.sin(NUM_WAVES * theta + phaseNow);
      const x = Math.round((cx + r * Math.cos(theta)) * 10) / 10;
      const y = Math.round((cy + r * Math.sin(theta)) * 10) / 10;
      if (i === 0) {
        d = "M " + x + "," + y;
      } else {
        d = d + " L " + x + "," + y;
      }
    }
    return { d };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

const WavyArcMemo = memo(WavyArc);

// ─── Fallback single arc (when no drink data) ────────────────────────────────

function FallbackArc({
  cx,
  cy,
  radius,
  strokeWidth,
  progress,
  phase,
}: {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  progress: number;
  phase: SharedValue<number>;
}) {
  const animLen = useSharedValue(0);
  useEffect(() => {
    animLen.value = withSpring(Math.min(progress / 100, 1), {
      damping: 15,
      stiffness: 80,
    });
  }, [progress]);

  const NUM_WAVES = 10;
  const AMPLITUDE = 2.8;

  const animatedProps = useAnimatedProps(() => {
    const len = animLen.value;
    if (len <= 0.001) return { d: "M 0,0" };

    const startAngle = -Math.PI / 2;
    const totalAngle = len * 2 * Math.PI;
    const steps = Math.max(4, Math.round(90 * len));

    let d = "";
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const theta = startAngle + t * totalAngle;
      const r = radius + AMPLITUDE * Math.sin(NUM_WAVES * theta + phase.value);
      const x = Math.round((cx + r * Math.cos(theta)) * 10) / 10;
      const y = Math.round((cy + r * Math.sin(theta)) * 10) / 10;
      if (i === 0) {
        d = "M " + x + "," + y;
      } else {
        d = d + " L " + x + "," + y;
      }
    }
    return { d };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      stroke="#9CD5FF"
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

const FallbackArcMemo = memo(FallbackArc);

// ─── Main component ──────────────────────────────────────────────────────────

export const AnimatedRing: React.FC<AnimatedRingProps> = ({
  progress,
  size = 240,
  strokeWidth = 18,
  currentAmount,
  goal,
  unit,
  formatAmount,
  drinkBreakdown = [],
}) => {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Shared phase drives ALL wavy arcs in sync — one animation for the whole ring
  const phase = useSharedValue(0);
  useEffect(() => {
    // Animate to 500× 2π (≈22 min) in one unbroken withTiming so the value
    // never resets and there is no mid-loop jump frame.
    const CYCLES = 500;
    phase.value = withTiming(2 * Math.PI * CYCLES, {
      duration: 2600 * CYCLES,
      easing: Easing.linear,
    });
    return () => cancelAnimation(phase);
  }, []);


  // Build arc segments from drink breakdown — ring always caps at 100 %
  const totalProgress = Math.min(progress / 100, 1);

  type Segment = {
    type: string;
    startFraction: number;
    lengthFraction: number;
    color: string;
  };
  const segments = useMemo<Segment[]>(() => {
    if (drinkBreakdown.length === 0 || goal <= 0) return [];
    const result: Segment[] = [];
    let cumulative = 0;
    for (const d of drinkBreakdown) {
      if (d.amount <= 0) continue;
      const fraction = d.amount / goal;
      const clamped = Math.max(0, Math.min(fraction, totalProgress - cumulative));
      if (clamped > 0.001) {
        result.push({
          type: d.type,
          startFraction: cumulative,
          lengthFraction: clamped,
          color: d.color,
        });
        cumulative += clamped;
      }
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drinkBreakdown, totalProgress, goal]);

  const goalReached = currentAmount >= goal;
  const exceededAmount = goalReached ? currentAmount - goal : 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={theme.progressBackground}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Wavy arcs — one per drink type */}
        {segments.length > 0 ? (
          segments.map((seg) => (
            <WavyArcMemo
              key={seg.type}
              cx={cx}
              cy={cy}
              radius={radius}
              strokeWidth={strokeWidth}
              startFraction={seg.startFraction}
              lengthFraction={seg.lengthFraction}
              color={seg.color}
              phase={phase}
            />
          ))
        ) : (
          <FallbackArcMemo
            cx={cx}
            cy={cy}
            radius={radius}
            strokeWidth={strokeWidth}
            progress={progress}
            phase={phase}
          />
        )}
      </Svg>

      {/* Centre text */}
      <View style={styles.centerContent}>
        <Text
          style={[styles.amountText, { color: theme.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatAmount(currentAmount)}
        </Text>
        {goalReached ? (
          <Text style={[styles.percentText, { color: "#4CAF50" }]}>
            Goal reached ✓
          </Text>
        ) : (
          <Text style={[styles.percentText, { color: theme.textSecondary }]}>
            {Math.round(progress)}% of goal
          </Text>
        )}
        <Text style={[styles.goalText, { color: theme.textSecondary }]}>
          Goal: {formatAmount(goal)}
        </Text>
        {exceededAmount > 0 && (
          <View style={[styles.excessBadge, { backgroundColor: theme.progressBackground }]}>
            <Text style={[styles.excessText, { color: theme.textSecondary }]}>
              +{formatAmount(exceededAmount)} over
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  amountText: {
    fontSize: FontSize.hero,
    fontFamily: FontFamily.bold,
    letterSpacing: -2,
    textAlign: "center",
  },
  percentText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  goalText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.light,
    marginTop: 2,
  },
  excessBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  excessText: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    letterSpacing: 0.3,
  },
});
