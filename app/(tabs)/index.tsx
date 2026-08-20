import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
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
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { AnimatedRing, DrinkBreakdown } from "../../components/ui/AnimatedRing";
import { AppLogoMark } from "../../components/ui/AppLogoMark";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { GlassCard } from "../../components/ui/GlassCard";
import { GradientButton } from "../../components/ui/GradientButton";
import { PresetEditorSheet } from "../../components/ui/PresetEditorSheet";
import { ReminderSetupModal } from "../../components/ReminderSetupModal";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import { withTabUnmountOnBlur } from "../../components/ui/withTabUnmountOnBlur";
import {
  DEFAULT_QUICK_ADD_AMOUNTS,
  DRINK_TYPES,
  MaterialIconName,
  QUICK_ADD_DRINKS,
} from "../../constants/drinks";
import {
  BorderRadius,
  Colors,
  FontFamily,
  FontSize,
} from "../../constants/theme";
import { useHydration } from "../../hooks/useHydration";
import { useStreak } from "../../hooks/useStreak";
import { useTheme } from "../../hooks/useTheme";
import { AppDispatch, RootState } from "../../store";
import {
  fetchLogsForRangeThunk,
  HydrationLog,
} from "../../store/slices/hydrationSlice";
import {
  formatAmount,
  formatTime,
  getDateDaysAgo,
  getGreeting,
  getTodayString,
} from "../../utils/dateUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function QuickAddButton({
  amount,
  unit,
  onPress,
  onLongPress,
  theme,
  drinkColor,
  drinkIcon,
}: {
  amount: number;
  unit: string;
  onPress: () => void;
  onLongPress?: () => void;
  theme: any;
  drinkColor: string;
  drinkIcon: MaterialIconName;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 14 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    });
    onPress();
  };

  const displayAmount =
    unit === "oz" ? `${Math.round(amount * 0.033814 * 10) / 10}` : `${amount}`;

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={1}
    >
      <Animated.View style={animStyle}>
        <LinearGradient
          colors={[drinkColor + "38", drinkColor + "10"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.quickAddBtn, { borderColor: drinkColor + "55" }]}
        >
          <View
            style={[
              styles.quickAddIconWrap,
              { backgroundColor: drinkColor + "30" },
            ]}
          >
            <MaterialIcons name={drinkIcon} size={15} color={drinkColor} />
          </View>
          <Text style={[styles.quickAddAmount, { color: theme.text }]}>
            +{displayAmount}
          </Text>
          <Text style={[styles.quickAddUnit, { color: theme.textSecondary }]}>
            {unit}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

function CelebrationOverlay({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone: () => void;
}) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset synchronously so a re-trigger doesn't jump from a stale position
      scale.value = 0.85;
      opacity.value = 0;
      // Slight overshoot on scale gives a gentle "settle" jump, slow enough to read
      scale.value = withTiming(1, {
        duration: 550,
        easing: Easing.out(Easing.back(1.3)),
      });
      opacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.cubic),
      });
      let innerT: ReturnType<typeof setTimeout>;
      const t = setTimeout(() => {
        scale.value = withTiming(0.92, {
          duration: 350,
          easing: Easing.in(Easing.cubic),
        });
        opacity.value = withTiming(0, {
          duration: 350,
          easing: Easing.in(Easing.cubic),
        });
        innerT = setTimeout(onDone, 350);
      }, 2500);
      return () => {
        clearTimeout(t);
        clearTimeout(innerT);
      };
    }
  }, [visible]);

  // Backdrop fades on its own opacity so the dim doesn't snap in/out instantly
  const bgStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[styles.celebrationBg, bgStyle]}>
        <Animated.View style={[styles.celebrationContent, contentStyle]}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationTitle}>Goal Reached!</Text>
          <View style={styles.celebrationSubRow}>
            <AppLogoMark size={26} />
            <Text style={styles.celebrationSub}>Amazing hydration today!</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function HomeScreen() {
  const theme = useTheme();
  // Only insets.bottom is needed — ScreenWrapper's SafeAreaView handles the top.
  const { bottom: bottomInset } = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const {
    todayLogs,
    todayTotal,
    rawTotal,
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
  // Fallback covers state persisted before quickAddPresets existed
  const quickAddPresets =
    useSelector((state: RootState) => state.profile.quickAddPresets) ??
    DEFAULT_QUICK_ADD_AMOUNTS;

  const [sheetVisible, setSheetVisible] = useState(false);
  const [presetSheetVisible, setPresetSheetVisible] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedDrink, setSelectedDrink] = useState("water");
  const [quickAddDrink, setQuickAddDrink] = useState("water");
  const [showCelebration, setShowCelebration] = useState(false);
  const [prevPercent, setPrevPercent] = useState(progressPercent);

  const drinkBreakdown = useMemo<DrinkBreakdown[]>(() => {
    // Process logs oldest-first, accumulate per drink type, stop at goal.
    // This ensures ring segments reflect only what contributed to reaching the goal.
    const sorted = [...todayLogs].sort(
      (a: HydrationLog, b: HydrationLog) => a.timestamp - b.timestamp,
    );
    const totals: Record<string, number> = {};
    let cumulative = 0;
    for (const log of sorted) {
      if (cumulative >= goal) break;
      const contribution = Math.min(log.amount, goal - cumulative);
      totals[log.type] = (totals[log.type] || 0) + contribution;
      cumulative += contribution;
    }
    return DRINK_TYPES.filter((d) => (totals[d.id] ?? 0) > 0).map((d) => ({
      type: d.id,
      amount: totals[d.id] ?? 0,
      color: d.color,
    }));
  }, [todayLogs, goal]);

  const fabScale = useSharedValue(1);

  useEffect(() => {
    if (uid) {
      const endDate = getTodayString();
      const startDate = getDateDaysAgo(30);
      dispatch(fetchLogsForRangeThunk({ uid, startDate, endDate }));
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
    addLog(amount, quickAddDrink);
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
          { paddingTop: 16, paddingBottom: bottomInset + 180 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
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
            drinkBreakdown={drinkBreakdown}
          />
          <Text style={[styles.unitLabel, { color: theme.textSecondary }]}>
            {unit === "oz" ? "oz" : "ml"}
          </Text>

          {/* Drink-type colour legend */}
          {drinkBreakdown.length > 0 && (
            <View style={styles.drinkLegend}>
              {drinkBreakdown.map((d) => {
                const drink = DRINK_TYPES.find((dt) => dt.id === d.type);
                if (!drink) return null;
                return (
                  <View key={d.type} style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: drink.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.legendLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {drink.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Quick Add */}
        {(() => {
          const activeDrink =
            DRINK_TYPES.find((d) => d.id === quickAddDrink) || DRINK_TYPES[0];
          return (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Quick Add
              </Text>
              {/* Drink type pill selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.drinkPillScroll}
                contentContainerStyle={styles.drinkPillContent}
              >
                {QUICK_ADD_DRINKS.map((drink) => {
                  const active = drink.id === quickAddDrink;
                  return (
                    <TouchableOpacity
                      key={drink.id}
                      onPress={() => {
                        setQuickAddDrink(drink.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.drinkPill,
                          active
                            ? {
                                backgroundColor: drink.color + "30",
                                borderColor: drink.color,
                              }
                            : {
                                backgroundColor: theme.card,
                                borderColor: theme.cardBorder,
                              },
                        ]}
                      >
                        <MaterialIcons
                          name={drink.icon}
                          size={14}
                          color={active ? drink.color : theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.drinkPillLabel,
                            {
                              color: active ? drink.color : theme.textSecondary,
                            },
                          ]}
                        >
                          {drink.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickAddScroll}
                contentContainerStyle={styles.quickAddRow}
              >
                {quickAddPresets.map((amount) => (
                  <QuickAddButton
                    key={amount}
                    amount={amount}
                    unit={unit}
                    onPress={() => handleQuickAdd(amount)}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setPresetSheetVisible(true);
                    }}
                    theme={theme}
                    drinkColor={activeDrink.color}
                    drinkIcon={activeDrink.icon}
                  />
                ))}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPresetSheetVisible(true);
                  }}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Edit quick add presets"
                >
                  <View
                    style={[
                      styles.editPresetsBtn,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.cardBorder,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="edit"
                      size={16}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.editPresetsLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Edit
                    </Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </>
          );
        })()}

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
          todayLogs.map((log: HydrationLog) => {
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
                        name={drink.icon}
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
                    <View style={styles.logAmountCol}>
                      <Text style={[styles.logAmount, { color: theme.accent }]}>
                        +{formatAmount(log.amount, unit)}
                      </Text>
                      {log.hydrationValue !== log.amount && (
                        <Text
                          style={[
                            styles.logEffective,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {formatAmount(log.hydrationValue, unit)} effective
                        </Text>
                      )}
                    </View>
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
      <Animated.View style={[styles.fab, { bottom: fabBottom }, fabStyle]}>
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
                fontFamily: FontFamily.regular,
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
                    name={drink.icon}
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

      {/* Quick Add Preset Editor */}
      <PresetEditorSheet
        visible={presetSheetVisible}
        onClose={() => setPresetSheetVisible(false)}
      />

      <CelebrationOverlay
        visible={showCelebration}
        onDone={() => setShowCelebration(false)}
      />

      <ReminderSetupModal />
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
  headerLeft: {
    flex: 1,
    paddingRight: 12,
  },
  greeting: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
    marginBottom: 2,
  },
  date: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
  },
  streakBadge: {
    borderRadius: 16,
  },
  streakText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
  },
  ringContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  unitLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    marginTop: 4,
  },
  drinkLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.semibold,
    marginBottom: 12,
  },
  drinkPillScroll: {
    marginBottom: 12,
    marginHorizontal: -20,
  },
  drinkPillContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
  },
  drinkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  drinkPillLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
  },
  quickAddScroll: {
    marginHorizontal: -20,
    marginBottom: 28,
  },
  quickAddRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 2,
  },
  quickAddBtn: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 5,
    width: 78,
  },
  quickAddIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  quickAddAmount: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
  },
  quickAddUnit: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    letterSpacing: 0.2,
  },
  editPresetsBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: 5,
    width: 60,
    alignSelf: "stretch",
  },
  editPresetsLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    letterSpacing: 0.2,
  },
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logCount: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
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
    fontFamily: FontFamily.semibold,
  },
  logTime: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
  },
  logAmountCol: {
    alignItems: "flex-end",
  },
  logAmount: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
  },
  logEffective: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    marginTop: 2,
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
    fontFamily: FontFamily.semibold,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 24,
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
    fontFamily: FontFamily.semibold,
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
    fontFamily: FontFamily.bold,
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
    fontFamily: FontFamily.semibold,
  },
  drinkMultiplier: {
    fontSize: 10,
    fontFamily: FontFamily.light,
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
    fontFamily: FontFamily.bold,
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
    fontFamily: FontFamily.regular,
    color: "rgba(247,248,240,0.7)",
    flexShrink: 1,
  },
});

export default withTabUnmountOnBlur(HomeScreen);
