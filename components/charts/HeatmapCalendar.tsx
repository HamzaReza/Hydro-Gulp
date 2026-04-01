import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useTheme } from "../../hooks/useTheme";
import { FontFamily, FontSize } from "../../constants/theme";
import { getDatesInMonth } from "../../utils/dateUtils";

interface HeatmapCalendarProps {
  year: number;
  month: number; // 0-indexed
  data: Record<string, number>; // date -> total ml
  goal: number;
  maxMonthsBack?: number;
  onMonthChange: (year: number, month: number) => void;
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  year,
  month,
  data,
  goal,
  maxMonthsBack = 2,
  onMonthChange,
}) => {
  const theme = useTheme();
  const dates = getDatesInMonth(year, month);
  const firstDate = new Date(year, month, 1);
  const startDayOfWeek = firstDate.getDay();

  const getIntensity = (dateStr: string): number => {
    const val = data[dateStr] || 0;
    if (val === 0) return 0;
    return Math.min(val / goal, 1);
  };

  const getColor = (intensity: number): string => {
    if (intensity === 0) return theme.card;
    const opacity = 0.2 + intensity * 0.8;
    return theme.isDark
      ? `rgba(156, 213, 255, ${opacity})`
      : `rgba(53, 88, 114, ${opacity})`;
  };

  const cells: (string | null)[] = [
    ...Array(startDayOfWeek).fill(null),
    ...dates,
  ];

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const monthName = new Date(year, month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth();
  const minAnchor = new Date(currentY, currentM - maxMonthsBack, 1);
  const minY = minAnchor.getFullYear();
  const minM = minAnchor.getMonth();

  const visibleKey = year * 12 + month;
  const minKey = minY * 12 + minM;
  const maxKey = currentY * 12 + currentM;
  const canGoPrev = visibleKey > minKey;
  const canGoNext = visibleKey < maxKey;

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  };

  return (
    <View>
      <View style={styles.monthHeader}>
        <TouchableOpacity
          style={styles.monthNavBtn}
          onPress={() => shiftMonth(-1)}
          disabled={!canGoPrev}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <MaterialIcons
            name="chevron-left"
            size={22}
            color={theme.accent}
            style={{ opacity: canGoPrev ? 1 : 0.35 }}
          />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: theme.text, flex: 1 }]}>
          {monthName}
        </Text>
        <TouchableOpacity
          style={styles.monthNavBtn}
          onPress={() => shiftMonth(1)}
          disabled={!canGoNext}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={theme.accent}
            style={{ opacity: canGoNext ? 1 : 0.35 }}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.dayLabels}>
        {DAY_LABELS.map((d) => (
          <Text
            key={d}
            style={[styles.dayLabel, { color: theme.textSecondary }]}
          >
            {d}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIdx) => (
        <View key={weekIdx} style={styles.week}>
          {week.map((dateStr, dayIdx) => {
            if (!dateStr) {
              return <View key={dayIdx} style={styles.cell} />;
            }
            const intensity = getIntensity(dateStr);
            const dayNum = parseInt(dateStr.split('-')[2], 10);
            return (
              <View
                key={dateStr}
                style={[
                  styles.cell,
                  {
                    backgroundColor: getColor(intensity),
                    borderColor: theme.cardBorder,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    { color: intensity > 0.5 ? (theme.isDark ? '#fff' : '#fff') : theme.textSecondary },
                  ]}
                >
                  {dayNum}
                </Text>
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.legend}>
        <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>
          Less
        </Text>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <View
            key={v}
            style={[
              styles.legendCell,
              {
                backgroundColor: getColor(v),
                borderColor: theme.cardBorder,
                borderWidth: 1,
              },
            ]}
          />
        ))}
        <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>
          More
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  monthTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
    textAlign: "center",
  },
  dayLabels: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
  },
  week: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 6,
    marginHorizontal: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNum: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  legendCell: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.light,
    marginHorizontal: 4,
  },
});
