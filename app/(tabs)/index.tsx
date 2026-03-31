import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { AnimatedRing } from "../../components/ui/AnimatedRing";
import { AppLogoMark } from "../../components/ui/AppLogoMark";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { GlassCard } from "../../components/ui/GlassCard";
import { GradientButton } from "../../components/ui/GradientButton";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import { DRINK_TYPES, QUICK_ADD_AMOUNTS } from "../../constants/drinks";
import { BorderRadius, Colors, FontSize } from "../../constants/theme";
import { useHydration } from "../../hooks/useHydration";
import { useStreak } from "../../hooks/useStreak";
import { useTheme } from "../../hooks/useTheme";
import { AppDispatch, RootState } from "../../store";
import { fetchTodayLogsThunk } from "../../store/slices/hydrationSlice";
import {
  formatAmount,
  formatTime,
  getGreeting,
  getTodayString,
} from "../../utils/dateUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function CelebrationOverlay({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone: () => void;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 10 });
      opacity.value = withTiming(1, { duration: 300 });
      const t = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 500 });
        setTimeout(onDone, 500);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <View style={styles.celebrationBg}>
        <Animated.View style={[styles.celebrationContent, style]}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationTitle}>Goal Reached!</Text>
          <View style={styles.celebrationSubRow}>
            <AppLogoMark size={26} />
            <Text style={styles.celebrationSub}>Amazing hydration today!</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  // Only insets.bottom is needed — ScreenWrapper's SafeAreaView handles the top.
  const { bottom: bottomInset } = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const {
    todayLogs,
    todayTotal,
    goal,
    unit,
    progressPercent,
    addLog,
    deleteLog,
  } = useHydration();
  const { currentStreak } = useStreak();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const name =
    useSelector((state: RootState) => state.profile.name) || "Friend";

  const [sheetVisible, setSheetVisible] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedDrink, setSelectedDrink] = useState("water");
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevPercent, setPrevPercent] = useState(0);

  const fabScale = useSharedValue(1);

  useEffect(() => {
    if (uid) {
      dispatch(fetchTodayLogsThunk({ uid, date: getTodayString() }));
    }
  }, [uid]);

  useEffect(() => {
    if (progressPercent >= 100 && prevPercent < 100) {
      setShowCelebration(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setPrevPercent(progressPercent);
  }, [progressPercent]);

  const handleQuickAdd = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addLog(amount, "water");
  };

  const handleCustomLog = () => {
    const amount = parseInt(customAmount, 10);
    if (!amount || amount <= 0 || amount > 5000) {
      Alert.alert(
        "Invalid amount",
        "Please enter a valid amount between 1 and 5000 ml.",
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addLog(amount, selectedDrink);
    setCustomAmount("");
    setSheetVisible(false);
  };

  const handleDeleteLog = (logId: string, date: string) => {
    Alert.alert("Delete Log", "Remove this log entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          deleteLog(logId, date);
        },
      },
    ]);
  };

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  // Tab bar height (64) + gap (12) + home-indicator safe area = always above the tab bar
  const fabBottom = bottomInset + 88;

  return (
    <ScreenWrapper>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scroll,
          // paddingTop: 16 only — SafeAreaView already added the status-bar inset
          // paddingBottom: room for floating tab bar + home indicator
          { paddingTop: 16, paddingBottom: bottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.text }]}>
              {getGreeting(name)}
            </Text>
            <Text style={[styles.date, { color: theme.textSecondary }]}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          {currentStreak > 0 && (
            <GlassCard style={styles.streakBadge} padding={10}>
              <Text style={[styles.streakText, { color: theme.text }]}>
                🔥 {currentStreak}
              </Text>
            </GlassCard>
          )}
        </View>

        {/* Progress Ring */}
        <View style={styles.ringContainer}>
          <AnimatedRing
            progress={progressPercent}
            size={Math.min(SCREEN_WIDTH - 80, 260)}
            currentAmount={todayTotal}
            goal={goal}
            unit={unit}
            formatAmount={(v) =>
              unit === "oz" ? `${Math.round(v * 0.033814 * 10) / 10}` : `${v}`
            }
          />
          <Text style={[styles.unitLabel, { color: theme.textSecondary }]}>
            {unit === "oz" ? "oz" : "ml"}
          </Text>
        </View>

        {/* Quick Add */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Quick Add
        </Text>
        <View style={styles.quickAddRow}>
          {QUICK_ADD_AMOUNTS.map((amount) => (
            <TouchableOpacity
              key={amount}
              onPress={() => handleQuickAdd(amount)}
              activeOpacity={0.75}
            >
              <GlassCard style={styles.quickAddCard} padding={12}>
                <Text style={[styles.quickAddAmount, { color: theme.accent }]}>
                  +
                  {unit === "oz"
                    ? `${Math.round(amount * 0.033814 * 10) / 10}`
                    : amount}
                </Text>
                <Text
                  style={[styles.quickAddUnit, { color: theme.textSecondary }]}
                >
                  {unit}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Logs */}
        <View style={styles.logsHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Today's Logs
          </Text>
          <Text style={[styles.logCount, { color: theme.textSecondary }]}>
            {todayLogs.length} entries
          </Text>
        </View>

        {todayLogs.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <AppLogoMark size={48} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No logs yet today
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: theme.textSecondary }]}
              >
                Tap a quick-add button above or use the + button below to log
                your first drink!
              </Text>
            </View>
          </GlassCard>
        ) : (
          todayLogs.map((log) => {
            const drink =
              DRINK_TYPES.find((d) => d.id === log.type) || DRINK_TYPES[0];
            return (
              <Animated.View key={log.id} entering={FadeIn} exiting={FadeOut}>
                <GlassCard style={styles.logItem} padding={14}>
                  <View style={styles.logContent}>
                    <View
                      style={[
                        styles.drinkIcon,
                        { backgroundColor: drink.color + "30" },
                      ]}
                    >
                      <MaterialIcons
                        name={drink.icon as any}
                        size={20}
                        color={drink.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.logDrink, { color: theme.text }]}>
                        {drink.label}
                      </Text>
                      <Text
                        style={[styles.logTime, { color: theme.textSecondary }]}
                      >
                        {formatTime(log.timestamp)}
                      </Text>
                    </View>
                    <Text style={[styles.logAmount, { color: theme.accent }]}>
                      +{formatAmount(log.amount, unit)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteLog(log.id, log.date)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <MaterialIcons
                        name="close"
                        size={16}
                        color={theme.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      {/* FAB — positioned above the floating tab bar, respects home-indicator safe area */}
      <Animated.View
        style={[styles.fab, styles.fabRing, { bottom: fabBottom }, fabStyle]}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setSheetVisible(true);
          }}
          activeOpacity={0.85}
          style={styles.fabInner}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <LinearGradient
            colors={[Colors.mediumBlue, Colors.lightBlue]}
            style={styles.fabGradient}
          >
            <MaterialIcons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Log Custom Amount Bottom Sheet */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title="Log Custom Amount"
        snapPoint={0.65}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>
            Amount ({unit})
          </Text>
          <View
            style={[
              styles.amountInput,
              {
                borderColor: theme.inputBorder,
                backgroundColor: theme.inputBackground,
              },
            ]}
          >
            <TextInput
              style={[styles.amountInputText, { color: theme.text }]}
              placeholder="e.g. 300"
              placeholderTextColor={theme.textSecondary + "80"}
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="number-pad"
              autoFocus
            />
            <Text
              style={{
                color: theme.textSecondary,
                fontFamily: "Inter_400Regular",
              }}
            >
              {unit}
            </Text>
          </View>

          <Text
            style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}
          >
            Drink Type
          </Text>
          <View style={styles.drinkGrid}>
            {DRINK_TYPES.map((drink) => (
              <TouchableOpacity
                key={drink.id}
                onPress={() => {
                  setSelectedDrink(drink.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.drinkOption,
                    {
                      backgroundColor:
                        selectedDrink === drink.id
                          ? drink.color + "30"
                          : theme.card,
                      borderColor:
                        selectedDrink === drink.id
                          ? drink.color
                          : theme.cardBorder,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={drink.icon as any}
                    size={22}
                    color={drink.color}
                  />
                  <Text
                    style={[styles.drinkOptionLabel, { color: theme.text }]}
                  >
                    {drink.label}
                  </Text>
                  <Text
                    style={[
                      styles.drinkMultiplier,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {Math.round(drink.hydrationMultiplier * 100)}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <GradientButton
            label="Log Drink"
            onPress={handleCustomLog}
            style={{ marginTop: 24 }}
          />
        </View>
      </BottomSheet>

      <CelebrationOverlay
        visible={showCelebration}
        onDone={() => setShowCelebration(false)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  greeting: {
    fontSize: FontSize.xl,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  date: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
  },
  streakBadge: {
    borderRadius: 16,
  },
  streakText: {
    fontSize: FontSize.base,
    fontFamily: "Inter_600SemiBold",
  },
  ringContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  unitLabel: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  quickAddRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  quickAddCard: {
    alignItems: "center",
    minWidth: 72,
    borderRadius: 16,
  },
  quickAddAmount: {
    fontSize: FontSize.base,
    fontFamily: "Inter_700Bold",
  },
  quickAddUnit: {
    fontSize: FontSize.xs,
    fontFamily: "Inter_300Light",
  },
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logCount: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
  },
  logItem: {
    marginBottom: 8,
    borderRadius: 16,
  },
  logContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  drinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logDrink: {
    fontSize: FontSize.base,
    fontFamily: "Inter_600SemiBold",
  },
  logTime: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
  },
  logAmount: {
    fontSize: FontSize.base,
    fontFamily: "Inter_700Bold",
  },
  deleteBtn: {
    padding: 4,
  },
  emptyCard: {
    borderRadius: 20,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: FontSize.base,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 24,
  },
  fabRing: {
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.35)",
    backgroundColor: "transparent",
  },
  fabInner: {
    borderRadius: 32,
    overflow: "hidden",
  },
  fabGradient: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  amountInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    height: 56,
    gap: 8,
  },
  amountInputText: {
    flex: 1,
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  drinkGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  drinkOption: {
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    minWidth: 80,
    gap: 4,
  },
  drinkOptionLabel: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_600SemiBold",
  },
  drinkMultiplier: {
    fontSize: 10,
    fontFamily: "Inter_300Light",
  },
  celebrationBg: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  celebrationContent: {
    backgroundColor: "rgba(53, 88, 114, 0.95)",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(156,213,255,0.3)",
  },
  celebrationEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  celebrationTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.offWhite,
    marginBottom: 6,
  },
  celebrationSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  celebrationSub: {
    fontSize: FontSize.base,
    fontFamily: "Inter_400Regular",
    color: "rgba(247,248,240,0.7)",
    flexShrink: 1,
  },
});
