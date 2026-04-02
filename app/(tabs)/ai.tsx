import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { GlassCard } from "../../components/ui/GlassCard";
import { PremiumLock } from "../../components/ui/PremiumLock";
import { withTabUnmountOnBlur } from "../../components/ui/withTabUnmountOnBlur";
import { Colors, FontFamily, FontSize } from "../../constants/theme";
import { useHydration } from "../../hooks/useHydration";
import { usePremium } from "../../hooks/usePremium";
import { useStreak } from "../../hooks/useStreak";
import { useTheme } from "../../hooks/useTheme";
import { AppDispatch, RootState } from "../../store";
import { clearAIError, fetchAIInsightThunk } from "../../store/slices/aiSlice";
import { HydrationLog } from "../../store/slices/hydrationSlice";
import { getLast7Days, getTodayString } from "../../utils/dateUtils";

function computeStats(
  logs: Record<string, HydrationLog[]>,
  goal: number,
  currentStreak: number,
) {
  const last7 = getLast7Days();
  const avg7 = Math.round(
    last7.reduce(
      (s, d) =>
        s +
        (logs[d] || []).reduce(
          (a: number, l: HydrationLog) => a + l.hydrationValue,
          0,
        ),
      0,
    ) / 7,
  );

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

  return { avg7, hydrationScore };
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 75
      ? Colors.success
      : score >= 50
        ? Colors.mediumBlue
        : Colors.warning;

  return (
    <LinearGradient colors={[color + "cc", color]} style={styles.scoreRing}>
      <Text style={styles.scoreRingValue}>{score}</Text>
      <Text style={styles.scoreRingLabel}>score</Text>
    </LinearGradient>
  );
}

function AIContent() {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  const { todayTotal, goal, unit } = useHydration();
  const { currentStreak } = useStreak();
  const logs = useSelector((s: RootState) => s.hydration.logs);
  const ai = useSelector((s: RootState) => s.ai);
  const today = getTodayString();

  const { avg7, hydrationScore } = computeStats(logs, goal, currentStreak);
  const pct = goal > 0 ? Math.round((todayTotal / goal) * 100) : 0;
  const isCached = ai.fetchedDate === today && !!ai.quote;

  const fetchInsight = useCallback(
    (force = false) => {
      dispatch(
        fetchAIInsightThunk({
          todayTotal,
          goal,
          avg7,
          hydrationScore,
          unit,
          force,
        }),
      );
    },
    [dispatch, todayTotal, goal, avg7, hydrationScore, unit],
  );

  useEffect(() => {
    if (!isCached) fetchInsight();
  }, []);

  const handleRefresh = () => {
    dispatch(clearAIError());
    fetchInsight(true);
  };

  return (
    <View>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>AI Insights</Text>
        </View>
        <Pressable
          onPress={handleRefresh}
          disabled={ai.loading}
          style={({ pressed }) => [
            styles.refreshBtn,
            {
              backgroundColor: theme.inputBackground,
              borderColor: theme.inputBorder,
              opacity: pressed || ai.loading ? 0.6 : 1,
            },
          ]}
        >
          <MaterialIcons
            name="refresh"
            size={20}
            color={theme.accent}
            style={ai.loading ? styles.spinning : undefined}
          />
        </Pressable>
      </View>

      {/* Today stats row */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard} padding={14}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {todayTotal}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Today ({unit})
            </Text>
          </GlassCard>
          <GlassCard style={styles.statCard} padding={14}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {pct}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              Of goal
            </Text>
          </GlassCard>
          <GlassCard style={styles.statCard} padding={14}>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {avg7}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
              7d avg ({unit})
            </Text>
          </GlassCard>
        </View>
      </Animated.View>

      {/* Loading */}
      {ai.loading && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.loadingCard}
        >
          <GlassCard padding={28}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
              Generating your personalized insight…
            </Text>
          </GlassCard>
        </Animated.View>
      )}

      {/* Error */}
      {!ai.loading && ai.error && (
        <Animated.View entering={FadeIn.duration(300)}>
          <GlassCard style={styles.errorCard} padding={20}>
            <MaterialIcons
              name="error-outline"
              size={28}
              color={Colors.error}
            />
            <Text style={[styles.errorText, { color: theme.text }]}>
              {ai.error}
            </Text>
            <Pressable
              onPress={handleRefresh}
              style={[styles.retryBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.retryBtnText}>Try again</Text>
            </Pressable>
          </GlassCard>
        </Animated.View>
      )}

      {/* Insight cards */}
      {!ai.loading && ai.quote && (
        <>
          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <GlassCard style={styles.card} padding={20}>
              <View style={styles.cardHeaderRow}>
                <LinearGradient
                  colors={[Colors.mediumBlue, Colors.lightBlue]}
                  style={styles.cardIconBg}
                >
                  <MaterialIcons name="format-quote" size={18} color="#fff" />
                </LinearGradient>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Today's Motivation
                </Text>
              </View>
              <Text style={[styles.quoteText, { color: theme.text }]}>
                {ai.quote}
              </Text>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(500)}>
            <GlassCard style={styles.card} padding={20}>
              <View style={styles.cardHeaderRow}>
                <LinearGradient
                  colors={[Colors.darkNavy, Colors.mediumBlue]}
                  style={styles.cardIconBg}
                >
                  <MaterialIcons name="lightbulb" size={18} color="#fff" />
                </LinearGradient>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  What To Do
                </Text>
                <ScoreRing score={hydrationScore} />
              </View>
              <Text style={[styles.suggestionText, { color: theme.text }]}>
                {ai.suggestion}
              </Text>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).duration(400)}>
            <Text style={[styles.footerNote, { color: theme.textSecondary }]}>
              {isCached
                ? "Insight generated today · refreshes tomorrow automatically"
                : "Freshly generated · uses 1 free AI token per refresh"}
            </Text>
          </Animated.View>
        </>
      )}

      {/* Empty state */}
      {!ai.loading && !ai.error && !ai.quote && (
        <Animated.View entering={FadeIn.duration(400)}>
          <GlassCard style={styles.emptyCard} padding={28}>
            <MaterialIcons name="water-drop" size={40} color={theme.accent} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              Start logging water
            </Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              Once you have some hydration data, AI will generate your
              personalized daily insight here.
            </Text>
          </GlassCard>
        </Animated.View>
      )}
    </View>
  );
}

function AIScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[theme.gradientStart, theme.gradientEnd]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isPremium ? (
          <AIContent />
        ) : (
          <View
            style={{
              minHeight: 520,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.cardBorder,
            }}
          >
            <PremiumLock
              title="Unlock AI Insights"
              description="Get a daily AI-powered motivation quote and personalized hydration advice based on your real stats."
            >
              <AIContent />
            </PremiumLock>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
  },
  subtitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  spinning: {
    opacity: 0.5,
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
    fontFamily: FontFamily.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    textAlign: "center",
  },

  loadingCard: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    marginTop: 12,
  },

  errorCard: {
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 20,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 14,
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: "#fff",
  },

  card: {
    marginBottom: 16,
    borderRadius: 20,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  cardIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
  },
  quoteText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.medium,
    lineHeight: 24,
    fontStyle: "italic",
  },
  suggestionText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    lineHeight: 22,
  },

  scoreRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRingValue: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: "#fff",
    lineHeight: 16,
  },
  scoreRingLabel: {
    fontSize: 8,
    fontFamily: FontFamily.regular,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 10,
  },

  footerNote: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },

  emptyCard: {
    alignItems: "center",
    borderRadius: 20,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.semibold,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default withTabUnmountOnBlur(AIScreen);
