import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { HeatmapCalendar } from "../../components/charts/HeatmapCalendar";
import { WeeklyBarChart } from "../../components/charts/WeeklyBarChart";
import { GlassCard } from "../../components/ui/GlassCard";
import { PremiumLock } from "../../components/ui/PremiumLock";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import { DRINK_TYPES } from "../../constants/drinks";
import { BorderRadius, Colors, FontSize } from "../../constants/theme";
import { useHydration } from "../../hooks/useHydration";
import { usePremium } from "../../hooks/usePremium";
import { useStreak } from "../../hooks/useStreak";
import { useTheme } from "../../hooks/useTheme";
import { AppDispatch, RootState } from "../../store";
import { fetchLogsForRangeThunk } from "../../store/slices/hydrationSlice";
import {
  formatAmount,
  formatDisplayDate,
  getLast30Days,
  getLast7Days,
} from "../../utils/dateUtils";

type ViewMode = "week" | "month" | "year";

export default function HistoryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { weeklyData, goal, unit } = useHydration();
  const { currentStreak, longestStreak, perfectDays } = useStreak();
  const { isPremium } = usePremium();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const logs = useSelector((state: RootState) => state.hydration.logs);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (uid) {
      const dates = getLast30Days();
      dispatch(
        fetchLogsForRangeThunk({
          uid,
          startDate: dates[0],
          endDate: dates[dates.length - 1],
        }),
      );
    }
  }, [uid]);

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const historyDates = viewMode === "week" ? getLast7Days() : getLast30Days();
  const datesWithLogs = historyDates.filter(
    (d) => logs[d] && logs[d].length > 0,
  );

  const calendarData: Record<string, number> = {};
  Object.entries(logs).forEach(([date, dayLogs]) => {
    calendarData[date] = dayLogs.reduce((sum, l) => sum + l.hydrationValue, 0);
  });

  const now = new Date();

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: theme.text }]}>History</Text>

        {/* View Toggle */}
        <GlassCard style={styles.toggleCard} padding={4}>
          <View style={styles.toggleRow}>
            {(["week", "month", "year"] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setViewMode(mode)}
                style={[
                  styles.toggleBtn,
                  viewMode === mode && { backgroundColor: theme.accent + "30" },
                ]}
              >
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color:
                        viewMode === mode ? theme.accent : theme.textSecondary,
                      fontFamily:
                        viewMode === mode
                          ? "Inter_600SemiBold"
                          : "Inter_400Regular",
                    },
                  ]}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* Chart */}
        <GlassCard style={styles.chartCard}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {viewMode === "week" ? "7-Day Intake" : "30-Day Intake"}
          </Text>
          {viewMode !== "year" ? (
            <WeeklyBarChart
              data={
                viewMode === "week"
                  ? weeklyData
                  : getLast30Days().map((date) => ({
                      date,
                      total: (logs[date] || []).reduce(
                        (sum, l) => sum + l.hydrationValue,
                        0,
                      ),
                    }))
              }
              goal={goal}
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Yearly view shows monthly summaries
              </Text>
            </View>
          )}
        </GlassCard>

        {/* Streak Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Current Streak", value: `${currentStreak}`, emoji: "🔥" },
            { label: "Longest Streak", value: `${longestStreak}`, emoji: "🏆" },
            { label: "Perfect Days", value: `${perfectDays}`, emoji: "✅" },
          ].map((stat) => (
            <GlassCard key={stat.label} style={styles.statCard} padding={14}>
              <Text style={styles.statEmoji}>{stat.emoji}</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                {stat.label}
              </Text>
            </GlassCard>
          ))}
        </View>

        {/* Heatmap Calendar — Premium */}
        {isPremium ? (
          <GlassCard style={styles.chartCard}>
            <HeatmapCalendar
              year={now.getFullYear()}
              month={now.getMonth()}
              data={calendarData}
              goal={goal}
            />
          </GlassCard>
        ) : (
          <GlassCard style={styles.chartCard} padding={0}>
            <PremiumLock
              title="Monthly Heatmap"
              description="Unlock Pro to see your hydration heatmap calendar."
            >
              <HeatmapCalendar
                year={now.getFullYear()}
                month={now.getMonth()}
                data={calendarData}
                goal={goal}
              />
            </PremiumLock>
          </GlassCard>
        )}

        {/* Log History */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Log History
        </Text>
        {datesWithLogs.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No logs found for this period.
              </Text>
            </View>
          </GlassCard>
        ) : (
          datesWithLogs
            .slice()
            .reverse()
            .map((date) => {
              const dayLogs = logs[date] || [];
              const dayTotal = dayLogs.reduce(
                (sum, l) => sum + l.hydrationValue,
                0,
              );
              const metGoal = dayTotal >= goal;
              const isExpanded = expandedDates.has(date);

              return (
                <GlassCard key={date} style={styles.dayCard} padding={0}>
                  <TouchableOpacity
                    onPress={() => toggleExpand(date)}
                    style={styles.dayHeader}
                    activeOpacity={0.75}
                  >
                    <View style={styles.dayHeaderLeft}>
                      <Text style={[styles.dayDate, { color: theme.text }]}>
                        {formatDisplayDate(date)}
                      </Text>
                      <Text
                        style={[
                          styles.dayTotal,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {formatAmount(dayTotal, unit)}
                      </Text>
                    </View>
                    <View style={styles.dayHeaderRight}>
                      {metGoal && (
                        <View
                          style={[
                            styles.goalBadge,
                            { backgroundColor: Colors.success + "25" },
                          ]}
                        >
                          <Text
                            style={{
                              color: Colors.success,
                              fontSize: 11,
                              fontFamily: "Inter_600SemiBold",
                            }}
                          >
                            ✓ Goal
                          </Text>
                        </View>
                      )}
                      <MaterialIcons
                        name={isExpanded ? "expand-less" : "expand-more"}
                        size={20}
                        color={theme.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.dayLogs}>
                      {dayLogs.map((log) => {
                        const drink =
                          DRINK_TYPES.find((d) => d.id === log.type) ||
                          DRINK_TYPES[0];
                        return (
                          <View
                            key={log.id}
                            style={[
                              styles.logRow,
                              { borderTopColor: theme.cardBorder },
                            ]}
                          >
                            <View
                              style={[
                                styles.drinkDot,
                                { backgroundColor: drink.color },
                              ]}
                            />
                            <Text
                              style={[styles.logDrink, { color: theme.text }]}
                            >
                              {drink.label}
                            </Text>
                            <Text
                              style={[
                                styles.logAmount,
                                { color: theme.accent },
                              ]}
                            >
                              {formatAmount(log.amount, unit)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </GlassCard>
              );
            })
        )}

        {/* Export CSV — Premium */}
        {isPremium ? (
          <TouchableOpacity
            style={[styles.exportBtn, { borderColor: theme.accent }]}
            onPress={() => Alert.alert("Export", "CSV export coming soon!")}
          >
            <MaterialIcons name="download" size={18} color={theme.accent} />
            <Text style={[styles.exportText, { color: theme.accent }]}>
              Export CSV
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.exportBtn,
              { borderColor: theme.textSecondary + "40" },
            ]}
            onPress={() =>
              Alert.alert(
                "Premium Feature",
                "Upgrade to Pro to export your data.",
              )
            }
          >
            <MaterialIcons name="lock" size={18} color={theme.textSecondary} />
            <Text style={[styles.exportText, { color: theme.textSecondary }]}>
              Export CSV (Pro)
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginBottom: 20,
  },
  toggleCard: { marginBottom: 16, borderRadius: 16 },
  toggleRow: { flexDirection: "row" },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  toggleText: { fontSize: FontSize.sm },
  chartCard: { marginBottom: 16, borderRadius: 20 },
  cardTitle: {
    fontSize: FontSize.base,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 16,
  },
  emptyChart: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
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
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: {
    fontSize: FontSize.xl,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  emptyCard: { borderRadius: 20, marginBottom: 12 },
  emptyState: { alignItems: "center", paddingVertical: 24 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  dayCard: { marginBottom: 8, borderRadius: 16, overflow: "hidden" },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  dayHeaderLeft: {},
  dayDate: {
    fontSize: FontSize.base,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  dayTotal: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
  },
  dayHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dayLogs: { paddingHorizontal: 14, paddingBottom: 10 },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  drinkDot: { width: 8, height: 8, borderRadius: 4 },
  logDrink: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
  },
  logAmount: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_600SemiBold",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    marginTop: 8,
  },
  exportText: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_600SemiBold",
  },
});
