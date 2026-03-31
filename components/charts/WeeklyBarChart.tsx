import React, { useState } from "react";
import { LayoutChangeEvent, ScrollView, View } from "react-native";
import Svg, {
  Defs,
  Line,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgGradient,
  Text as SvgText,
} from "react-native-svg";
import { Colors, FontFamily } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";

interface DayData {
  date: string;
  total: number;
}

type LabelType = "dayName" | "date" | "monthName";

interface WeeklyBarChartProps {
  data: DayData[];
  goal: number;
  scrollable?: boolean;
  labelType?: LabelType;
  showGoalLine?: boolean;
  unit?: "ml" | "oz";
  height?: number;
}

function getBarLabel(date: string, labelType: LabelType): string {
  if (labelType === "dayName") {
    return new Date(date + "T00:00:00")
      .toLocaleDateString("en-US", { weekday: "short" })
      .slice(0, 3);
  }
  if (labelType === "date") {
    return String(new Date(date + "T00:00:00").getDate());
  }
  if (labelType === "monthName") {
    const parts = date.split("-");
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      1,
    ).toLocaleDateString("en-US", {
      month: "short",
    });
  }
  return "";
}

function getTooltipLabel(date: string, labelType: LabelType): string {
  if (labelType === "monthName") {
    const parts = date.split("-");
    return new Date(
      parseInt(parts[0]),
      parseInt(parts[1]) - 1,
      1,
    ).toLocaleDateString("en-US", {
      month: "long",
    });
  }
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTooltipAmount(total: number, unit: "ml" | "oz"): string {
  if (unit === "oz") {
    return `${(Math.round(total * 0.033814 * 10) / 10).toFixed(1)} oz`;
  }
  return `${total.toLocaleString()} ml`;
}

const SCROLLABLE_BAR_WIDTH = 22;
const SCROLLABLE_BAR_SPACING = 34;
const TOOLTIP_W = 108;
const TOOLTIP_H = 42;

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({
  data,
  goal,
  scrollable = false,
  labelType = "date",
  showGoalLine = true,
  unit = "ml",
  height = 160,
}) => {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 16;
  const paddingBottom = 32;
  const chartHeight = height - paddingTop - paddingBottom;

  const totalWidth = scrollable
    ? paddingLeft + paddingRight + data.length * SCROLLABLE_BAR_SPACING
    : containerWidth;

  const chartWidth = totalWidth - paddingLeft - paddingRight;
  const barWidth = scrollable
    ? SCROLLABLE_BAR_WIDTH
    : Math.max(chartWidth / data.length - 8, 4);

  const maxValue = Math.max(goal * 1.2, ...data.map((d) => d.total), 100);
  const goalY = paddingTop + chartHeight - (goal / maxValue) * chartHeight;

  const getBarGeometry = (index: number) => {
    const spacing = scrollable
      ? SCROLLABLE_BAR_SPACING
      : chartWidth / data.length;
    const barX = paddingLeft + index * spacing + (spacing - barWidth) / 2;
    const barHeight = (data[index].total / maxValue) * chartHeight;
    const barY = paddingTop + chartHeight - barHeight;
    return { barX, barY, barHeight, spacing };
  };

  const renderTooltip = () => {
    if (selectedIndex === null) return null;
    const item = data[selectedIndex];
    const { barX, barY } = getBarGeometry(selectedIndex);
    const barCenterX = barX + barWidth / 2;

    const tooltipX = Math.max(
      paddingLeft,
      Math.min(
        barCenterX - TOOLTIP_W / 2,
        totalWidth - paddingRight - TOOLTIP_W,
      ),
    );
    const tooltipY = Math.max(4, barY - TOOLTIP_H - 10);
    const arrowTipY = tooltipY + TOOLTIP_H + 7;
    const arrowBaseY = tooltipY + TOOLTIP_H;

    const clampedArrowX = Math.max(
      tooltipX + 10,
      Math.min(barCenterX, tooltipX + TOOLTIP_W - 10),
    );

    const tooltipBg = theme.isDark ? "#1A2E3D" : "#FFFFFF";
    const tooltipBorder = theme.isDark
      ? "rgba(156, 213, 255, 0.28)"
      : "rgba(53, 88, 114, 0.18)";

    return (
      <>
        <Path
          d={`M ${clampedArrowX - 6} ${arrowBaseY} L ${clampedArrowX} ${arrowTipY} L ${clampedArrowX + 6} ${arrowBaseY} Z`}
          fill={tooltipBg}
          stroke={tooltipBorder}
          strokeWidth={1}
        />
        <Rect
          x={tooltipX}
          y={tooltipY}
          width={TOOLTIP_W}
          height={TOOLTIP_H}
          rx={8}
          fill={tooltipBg}
          stroke={tooltipBorder}
          strokeWidth={1}
        />
        <SvgText
          x={tooltipX + TOOLTIP_W / 2}
          y={tooltipY + 16}
          textAnchor="middle"
          fontSize={11}
          fill={theme.textSecondary}
          fontFamily={FontFamily.regular}
        >
          {getTooltipLabel(item.date, labelType)}
        </SvgText>
        <SvgText
          x={tooltipX + TOOLTIP_W / 2}
          y={tooltipY + 31}
          textAnchor="middle"
          fontSize={12}
          fill={theme.accent}
          fontFamily={FontFamily.semibold}
        >
          {formatTooltipAmount(item.total, unit)}
        </SvgText>
      </>
    );
  };

  const svgContent = (
    <Svg width={totalWidth} height={height}>
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

      {/* Invisible background — clears selection on tap */}
      <Rect
        x={0}
        y={0}
        width={totalWidth}
        height={height}
        fill="transparent"
        onPress={() => setSelectedIndex(null)}
      />

      {showGoalLine && (
        <Line
          x1={paddingLeft}
          y1={goalY}
          x2={totalWidth - paddingRight}
          y2={goalY}
          stroke={theme.textSecondary}
          strokeWidth={1.5}
          strokeDasharray="6,4"
          opacity={0.6}
        />
      )}

      {data.map((item, index) => {
        const { barX, barY, barHeight, spacing } = getBarGeometry(index);
        const metGoal = item.total >= goal;
        const isSelected = selectedIndex === index;

        return (
          <React.Fragment key={item.date}>
            <Rect
              x={barX}
              y={barY}
              width={barWidth}
              height={Math.max(barHeight, 2)}
              rx={5}
              fill={metGoal ? "url(#barGradientMet)" : "url(#barGradient)"}
              opacity={item.total === 0 ? 0.2 : isSelected ? 1 : 0.85}
              stroke={isSelected ? theme.accent : "none"}
              strokeWidth={isSelected ? 1.5 : 0}
              onPress={() =>
                setSelectedIndex(index === selectedIndex ? null : index)
              }
            />
            <SvgText
              x={barX + barWidth / 2}
              y={height - 8}
              textAnchor="middle"
              fontSize={10}
              fill={isSelected ? theme.accent : theme.textSecondary}
              fontFamily={isSelected ? FontFamily.semibold : FontFamily.regular}
              onPress={() =>
                setSelectedIndex(index === selectedIndex ? null : index)
              }
            >
              {getBarLabel(item.date, labelType)}
            </SvgText>
          </React.Fragment>
        );
      })}

      {renderTooltip()}
    </Svg>
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  };

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 4 }}
      >
        {svgContent}
      </ScrollView>
    );
  }

  return <View onLayout={onLayout}>{containerWidth > 0 && svgContent}</View>;
};
