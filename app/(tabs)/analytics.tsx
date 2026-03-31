import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { DonutChart } from "../../components/charts/DonutChart";
import { WeeklyBarChart } from "../../components/charts/WeeklyBarChart";
import { GlassCard } from "../../components/ui/GlassCard";
import { PremiumLock } from "../../components/ui/PremiumLock";
import { DRINK_TYPES } from "../../constants/drinks";
import { Colors, FontSize } from "../../constants/theme";
import { useHydration } from "../../hooks/useHydration";
import { usePremium } from "../../hooks/usePremium";
import { useStreak } from "../../hooks/useStreak";
import { useTheme } from "../../hooks/useTheme";
import { AppDispatch, RootState } from "../../store";
import {
  fetchLogsForRangeThunk,
  HydrationLog,
} from "../../store/slices/hydrationSlice";
import {
  getLast30Days,
  getLast7Days,
  getTimeOfDay,
} from "../../utils/dateUtils";

function AnalyticsContent() {
  const theme = useTheme();
  const { weeklyData, goal, unit } = useHydration();
  const { currentStreak, longestStreak, perfectDays } = useStreak();
  const logs = useSelector((state: RootState) => state.hydration.logs);

  const last7 = getLast7Days();
  const last30 = getLast30Days();

  const avg7 = (() => {
    const total = last7.reduce(
      (s, d) =>
        s +
        (logs[d] || []).reduce(
          (a: number, l: HydrationLog) => a + l.hydrationValue,
          0,
        ),
      0,
    );
    return Math.round(total / 7);
  })();

  const avg30 = (() => {
    const total = last30.reduce(
      (s, d) =>
        s +
        (logs[d] || []).reduce(
          (a: number, l: HydrationLog) => a + l.hydrationValue,
          0,
        ),
      0,
    );
    return Math.round(total / 30);
  })();

  // Drink type breakdown
  const drinkTotals: Record<string, number> = {};
  last30.forEach((date) => {
    (logs[date] || []).forEach((log: HydrationLog) => {
      drinkTotals[log.type] = (drinkTotals[log.type] || 0) + log.amount;
    });
  });

  const donutSegments = DRINK_TYPES.map((d) => ({
    type: d.id,
    value: drinkTotals[d.id] || 0,
    color: d.color,
  })).filter((s) => s.value > 0);

  const totalDrinks = donutSegments.reduce((s, d) => s + d.value, 0);

  // Time of day breakdown
  const timeOfDayTotals = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  last30.forEach((date) => {
    (logs[date] || []).forEach((log: HydrationLog) => {
      const period = getTimeOfDay(log.timestamp);
      timeOfDayTotals[period] += log.hydrationValue;
    });
  });

  // Hydration score
  const goalDays = last7.filter((d) => {
    const total = (logs[d] || []).reduce(
      (s: number, l: HydrationLog) => s + l.hydrationValue,
      0,
    );
    return total >= goal;
  }).length;
  const consistencyScore = Math.round((goalDays / 7) * 100);
  const streakScore = Math.min(currentStreak * 5, 100);
  const avgScore =
    avg7 > 0 ? Math.round(Math.min((avg7 / goal) * 100, 100)) : 0;
  const hydrationScore = Math.round(
    (consistencyScore + streakScore + avgScore) / 3,
  );

  // Insights
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  last30.forEach((date) => {
    const dow = new Date(date + "T00:00:00").getDay();
    const total = (logs[date] || []).reduce(
      (s: number, l: HydrationLog) => s + l.hydrationValue,
      0,
    );
    weekdayTotals[dow] += total;
    weekdayCounts[dow]++;
  });

  const weekdayAvgs = weekdayTotals.map((t, i) =>
    weekdayCounts[i] > 0 ? t / weekdayCounts[i] : 0,
  );
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const bestDay = weekdayNames[weekdayAvgs.indexOf(Math.max(...weekdayAvgs))];
  const worstDay =
    weekdayNames[
      weekdayAvgs.indexOf(Math.min(...weekdayAvgs.filter((v) => v > 0)))
    ];

  return (
    <View>
      {/* Averages */}
      <View style={styles.statsRow}>
        <GlassCard style={styles.statCard} padding={16}>
          <Text style={[styles.statValue, { color: theme.text }]}>{avg7}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Avg (7d)
          </Text>
          <Text style={[styles.statUnit, { color: theme.textSecondary }]}>
            ml/day
          </Text>
        </GlassCard>
        <GlassCard style={styles.statCard} padding={16}>
          <Text style={[styles.statValue, { color: theme.text }]}>{avg30}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Avg (30d)
          </Text>
          <Text style={[styles.statUnit, { color: theme.textSecondary }]}>
            ml/day
          </Text>
        </GlassCard>
        <GlassCard style={styles.statCard} padding={16}>
          <LinearGradient
            colors={[Colors.mediumBlue, Colors.lightBlue]}
            style={styles.scoreCircle}
          >
            <Text style={styles.scoreValue}>{hydrationScore}</Text>
          </LinearGradient>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Score
          </Text>
        </GlassCard>
      </View>

      {/* Weekly trend */}
      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          Weekly Trend
        </Text>
        <WeeklyBarChart data={weeklyData} goal={goal} />
      </GlassCard>

      {/* Drink Breakdown */}
      {donutSegments.length > 0 && (
        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            Drink Breakdown (30d)
          </Text>
          <DonutChart
            segments={donutSegments}
            size={180}
            centerLabel={`${Math.round(totalDrinks / 1000)}L`}
          />
        </GlassCard>
      )}

      {/* Time of Day */}
      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          By Time of Day
        </Text>
        {Object.entries(timeOfDayTotals).map(([period, total]) => {
          const maxVal = Math.max(...Object.values(timeOfDayTotals), 1);
          const pct = (total / maxVal) * 100;
          const icons: Record<string, string> = {
            morning: "🌅",
            afternoon: "☀️",
            evening: "🌇",
            night: "🌙",
          };
          return (
            <View key={period} style={styles.timeRow}>
              <Text style={styles.timeEmoji}>{icons[period]}</Text>
              <Text
                style={[
                  styles.timePeriod,
                  { color: theme.textSecondary, width: 80 },
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
              <View
                style={[
                  styles.timeBar,
                  { backgroundColor: theme.progressBackground },
                ]}
              >
                <View
                  style={[
                    styles.timeBarFill,
                    { width: `${pct}%`, backgroundColor: Colors.mediumBlue },
                  ]}
                />
              </View>
              <Text style={[styles.timeTotal, { color: theme.accent }]}>
                {total > 0 ? `${Math.round(total / 100) / 10}L` : "–"}
              </Text>
            </View>
          );
        })}
      </GlassCard>

      {/* Insights */}
      <GlassCard style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Insights</Text>
        {[
          bestDay !== worstDay && `💡 You hydrate best on ${bestDay}s.`,
          currentStreak > 3 &&
            `🔥 Great streak! You've been consistent for ${currentStreak} days.`,
          avg7 < goal * 0.8 &&
            `⚠️ Your 7-day average is below your goal. Try adding more logs!`,
          avg7 >= goal &&
            `✅ You're hitting your goal on average — keep it up!`,
          goalDays === 7 && `🏆 Perfect week! You hit your goal every day.`,
        ]
          .filter(Boolean)
          .map((insight, i) => (
            <View
              key={i}
              style={[
                styles.insightCard,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Text style={[styles.insightText, { color: theme.text }]}>
                {insight as string}
              </Text>
            </View>
          ))}

        {avg7 === 0 && (
          <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
            Start logging water to see insights here.
          </Text>
        )}
      </GlassCard>
    </View>
  );
}

export default function AnalyticsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { isPremium } = usePremium();
  const uid = useSelector((state: RootState) => state.auth.uid);

  useEffect(() => {
    if (uid && isPremium) {
      const dates = getLast30Days();
      dispatch(
        fetchLogsForRangeThunk({
          uid,
          startDate: dates[0],
          endDate: dates[dates.length - 1],
        }),
      );
    }
  }, [uid, isPremium]);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: theme.text }]}>
          Analytics
        </Text>

        {isPremium ? (
          <AnalyticsContent />
        ) : (
          <View
            style={{
              minHeight: 500,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.cardBorder,
            }}
          >
            <PremiumLock
              title="Unlock Analytics"
              description="Get deep insights into your hydration patterns, drink breakdowns, time-of-day analysis, and your personal Hydration Score."
            >
              <AnalyticsContent />
            </PremiumLock>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 16,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  statUnit: {
    fontSize: 10,
    fontFamily: "Inter_300Light",
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  scoreValue: {
    fontSize: FontSize.base,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  card: { marginBottom: 16, borderRadius: 20 },
  cardTitle: {
    fontSize: FontSize.base,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 16,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  timeEmoji: { fontSize: 16, width: 24 },
  timePeriod: { fontSize: FontSize.sm, fontFamily: "Inter_400Regular" },
  timeBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  timeBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  timeTotal: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_600SemiBold",
    width: 32,
    textAlign: "right",
  },
  insightCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  insightText: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  noDataText: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 16,
  },
});
