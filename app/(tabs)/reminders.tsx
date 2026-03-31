import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { GlassCard } from "../../components/ui/GlassCard";
import { GradientButton } from "../../components/ui/GradientButton";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import { BorderRadius, Colors, FontSize } from "../../constants/theme";
import { db } from "../../firebase";
import { usePremium } from "../../hooks/usePremium";
import { useTheme } from "../../hooks/useTheme";
import { AppDispatch, RootState } from "../../store";
import {
  addReminder,
  deleteReminder,
  setNotificationsEnabled,
  toggleReminder,
  updateReminder,
} from "../../store/slices/settingsSlice";
import {
  cancelReminder,
  generateSmartReminderTimes,
  parseTimeString,
  requestNotificationPermissions,
  scheduleReminder,
} from "../../utils/notificationUtils";

export default function RemindersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { isPremium } = usePremium();

  const uid = useSelector((state: RootState) => state.auth.uid);
  const { notificationsEnabled, reminders } = useSelector(
    (state: RootState) => state.settings,
  );
  const { wakeTime, sleepTime } = useSelector(
    (state: RootState) => state.profile,
  );

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<string | null>(null);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [reminderLabel, setReminderLabel] = useState("Time to hydrate!");

  const canAddReminder = isPremium || reminders.length < 1;

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          "Notifications Disabled",
          "Please enable notifications in your device settings to use reminders.",
          [{ text: "OK" }],
        );
        return;
      }
    }
    dispatch(setNotificationsEnabled(enabled));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggleReminder = async (reminderId: string) => {
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatch(toggleReminder(reminderId));

    if (!reminder.enabled && notificationsEnabled) {
      const { hour, minute } = parseTimeString(reminder.time);
      await scheduleReminder(reminderId, hour, minute, reminder.label);
    } else if (reminder.notificationId) {
      await cancelReminder(reminder.notificationId);
    }

    if (uid) {
      await setDoc(doc(db, "users", uid, "reminders", reminderId), {
        ...reminder,
        enabled: !reminder.enabled,
      }).catch(() => {});
    }
  };

  const handleSaveReminder = async () => {
    if (!reminderTime.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("Invalid Time", "Please enter time in HH:MM format.");
      return;
    }

    const { hour, minute } = parseTimeString(reminderTime);
    const id = editingReminder || `reminder-${Date.now()}`;

    let notificationId: string | undefined;
    if (notificationsEnabled) {
      notificationId =
        (await scheduleReminder(id, hour, minute, reminderLabel)) || undefined;
    }

    const reminder = {
      id,
      time: reminderTime,
      enabled: true,
      label: reminderLabel,
      smartReminder: false,
      notificationId,
    };

    if (editingReminder) {
      dispatch(updateReminder(reminder));
    } else {
      dispatch(addReminder(reminder));
    }

    if (uid) {
      await setDoc(doc(db, "users", uid, "reminders", id), reminder).catch(
        () => {},
      );
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSheetVisible(false);
    setEditingReminder(null);
    setReminderTime("08:00");
    setReminderLabel("Time to hydrate!");
  };

  const handleDeleteReminder = async (reminderId: string) => {
    const reminder = reminders.find((r) => r.id === reminderId);
    Alert.alert("Delete Reminder", "Remove this reminder?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (reminder?.notificationId) {
            await cancelReminder(reminder.notificationId);
          }
          dispatch(deleteReminder(reminderId));
          if (uid) {
            await deleteDoc(
              doc(db, "users", uid, "reminders", reminderId),
            ).catch(() => {});
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      },
    ]);
  };

  const handleGenerateSmartReminders = async () => {
    if (!isPremium) return;
    const count = 6;
    const times = generateSmartReminderTimes(
      wakeTime || "07:00",
      sleepTime || "23:00",
      count,
    );

    const newReminders = times.map((time, i) => ({
      id: `smart-${Date.now()}-${i}`,
      time,
      enabled: true,
      label: "Time to hydrate!",
      smartReminder: true,
    }));

    for (const r of newReminders) {
      dispatch(addReminder(r));
      const { hour, minute } = parseTimeString(r.time);
      if (notificationsEnabled) {
        await scheduleReminder(r.id, hour, minute, r.label);
      }
      if (uid) {
        await setDoc(doc(db, "users", uid, "reminders", r.id), r).catch(
          () => {},
        );
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Smart Reminders Set!",
      `${count} reminders added between ${wakeTime} and ${sleepTime}.`,
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: theme.text }]}>
          Reminders
        </Text>

        {/* Enable Notifications */}
        <GlassCard style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialIcons
                name="notifications"
                size={22}
                color={theme.accent}
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>
                  Push Notifications
                </Text>
                <Text
                  style={[styles.settingDesc, { color: theme.textSecondary }]}
                >
                  Enable daily reminders
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{
                false: theme.progressBackground,
                true: theme.accent,
              }}
              thumbColor="#fff"
            />
          </View>
        </GlassCard>

        {/* Smart Reminders (Premium) */}
        {isPremium && (
          <GlassCard style={styles.card}>
            <View style={styles.premiumHeader}>
              <MaterialIcons
                name="auto-awesome"
                size={20}
                color={Colors.lightBlue}
              />
              <Text style={[styles.premiumTitle, { color: theme.text }]}>
                Smart Reminders ✨
              </Text>
            </View>
            <Text
              style={[
                styles.settingDesc,
                { color: theme.textSecondary, marginBottom: 16 },
              ]}
            >
              Auto-space {6} reminders between {wakeTime || "07:00"} –{" "}
              {sleepTime || "23:00"}
            </Text>
            <GradientButton
              label="Generate Smart Schedule"
              onPress={handleGenerateSmartReminders}
              hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
            />
          </GlassCard>
        )}

        {!isPremium && (
          <GlassCard
            style={[styles.card, { borderColor: Colors.lightBlue + "40" }]}
          >
            <View style={styles.premiumHeader}>
              <MaterialIcons name="lock" size={20} color={Colors.lightBlue} />
              <Text style={[styles.premiumTitle, { color: theme.text }]}>
                Smart Reminders (Pro)
              </Text>
            </View>
            <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
              Upgrade to Pro for up to 8 smart reminders automatically spaced
              throughout your day.
            </Text>
          </GlassCard>
        )}

        {/* Reminders List */}
        <View style={styles.listHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            My Reminders ({reminders.length})
          </Text>
          {canAddReminder && (
            <TouchableOpacity
              onPress={() => {
                setEditingReminder(null);
                setSheetVisible(true);
              }}
              style={[
                styles.addBtn,
                {
                  backgroundColor: theme.accent + "20",
                  borderColor: theme.accent,
                },
              ]}
            >
              <MaterialIcons name="add" size={18} color={theme.accent} />
            </TouchableOpacity>
          )}
        </View>

        {!isPremium && reminders.length >= 1 && (
          <GlassCard
            style={[styles.limitCard, { borderColor: Colors.warning + "40" }]}
            padding={12}
          >
            <Text style={[styles.limitText, { color: Colors.warning }]}>
              ⚠️ Free plan: 1 reminder max. Upgrade to Pro for unlimited
              reminders.
            </Text>
          </GlassCard>
        )}

        {reminders.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>⏰</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No Reminders Yet
              </Text>
              <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                Tap the + button to add your first hydration reminder.
              </Text>
            </View>
          </GlassCard>
        ) : (
          reminders.map((reminder) => (
            <GlassCard
              key={reminder.id}
              style={styles.reminderCard}
              padding={14}
            >
              <View style={styles.reminderRow}>
                <View style={styles.reminderLeft}>
                  <Text style={[styles.reminderTime, { color: theme.text }]}>
                    {reminder.time}
                  </Text>
                  <Text
                    style={[
                      styles.reminderLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {reminder.label}
                    {reminder.smartReminder && (
                      <Text style={{ color: Colors.lightBlue }}> ✨</Text>
                    )}
                  </Text>
                </View>
                <View style={styles.reminderActions}>
                  <Switch
                    value={reminder.enabled}
                    onValueChange={() => handleToggleReminder(reminder.id)}
                    trackColor={{
                      false: theme.progressBackground,
                      true: theme.accent,
                    }}
                    thumbColor="#fff"
                  />
                  <TouchableOpacity
                    onPress={() => handleDeleteReminder(reminder.id)}
                    style={{ marginLeft: 8 }}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={20}
                      color={Colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          ))
        )}

        {/* Timeline visualization */}
        {reminders.length > 1 && (
          <GlassCard style={styles.card}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text, marginBottom: 16 },
              ]}
            >
              Timeline
            </Text>
            <View
              style={[
                styles.timeline,
                { backgroundColor: theme.progressBackground },
              ]}
            >
              {reminders
                .slice()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((r, i) => {
                  const { hour, minute } = parseTimeString(r.time);
                  const totalMinutes = hour * 60 + minute;
                  const pct = (totalMinutes / (24 * 60)) * 100;
                  return (
                    <View
                      key={r.id}
                      style={[
                        styles.timelineDot,
                        {
                          left: `${pct}%`,
                          backgroundColor: r.enabled
                            ? theme.accent
                            : theme.textSecondary + "60",
                        },
                      ]}
                    />
                  );
                })}
            </View>
            <View style={styles.timelineLabels}>
              <Text
                style={[styles.timelineLabel, { color: theme.textSecondary }]}
              >
                12 AM
              </Text>
              <Text
                style={[styles.timelineLabel, { color: theme.textSecondary }]}
              >
                6 AM
              </Text>
              <Text
                style={[styles.timelineLabel, { color: theme.textSecondary }]}
              >
                12 PM
              </Text>
              <Text
                style={[styles.timelineLabel, { color: theme.textSecondary }]}
              >
                6 PM
              </Text>
              <Text
                style={[styles.timelineLabel, { color: theme.textSecondary }]}
              >
                12 AM
              </Text>
            </View>
          </GlassCard>
        )}
      </ScrollView>

      {/* Add/Edit Reminder Sheet */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingReminder(null);
        }}
        title={editingReminder ? "Edit Reminder" : "Add Reminder"}
        snapPoint={0.55}
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>
            Time (HH:MM)
          </Text>
          <View
            style={[
              styles.timeInput,
              {
                borderColor: theme.inputBorder,
                backgroundColor: theme.inputBackground,
              },
            ]}
          >
            <MaterialIcons
              name="access-time"
              size={20}
              color={theme.accent}
              style={{ marginRight: 10 }}
            />
            <TextInput
              style={[styles.timeInputText, { color: theme.text }]}
              value={reminderTime}
              onChangeText={setReminderTime}
              placeholder="HH:MM"
              placeholderTextColor={theme.textSecondary + "80"}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>

          <Text
            style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}
          >
            Label
          </Text>
          <View
            style={[
              styles.timeInput,
              {
                borderColor: theme.inputBorder,
                backgroundColor: theme.inputBackground,
              },
            ]}
          >
            <MaterialIcons
              name="label"
              size={20}
              color={theme.accent}
              style={{ marginRight: 10 }}
            />
            <TextInput
              style={[styles.timeInputText, { color: theme.text, flex: 1 }]}
              value={reminderLabel}
              onChangeText={setReminderLabel}
              placeholder="Time to hydrate!"
              placeholderTextColor={theme.textSecondary + "80"}
            />
          </View>

          <GradientButton
            label="Save Reminder"
            onPress={handleSaveReminder}
            style={{ marginTop: 24 }}
          />
        </View>
      </BottomSheet>
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
  card: { marginBottom: 16, borderRadius: 20 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSize.base,
    fontFamily: "Inter_600SemiBold",
  },
  settingDesc: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  premiumTitle: {
    fontSize: FontSize.base,
    fontFamily: "Inter_600SemiBold",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontFamily: "Inter_600SemiBold",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  limitCard: { marginBottom: 12, borderRadius: 12, borderWidth: 1 },
  limitText: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
  },
  emptyCard: { borderRadius: 20, marginBottom: 16 },
  emptyState: { alignItems: "center", paddingVertical: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontSize: FontSize.base,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  reminderCard: { marginBottom: 8, borderRadius: 16 },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reminderLeft: {},
  reminderTime: {
    fontSize: FontSize.xl,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  reminderLabel: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
  },
  reminderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeline: {
    height: 8,
    borderRadius: 4,
    position: "relative",
    marginBottom: 8,
  },
  timelineDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    top: -2,
    marginLeft: -6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  timelineLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timelineLabel: {
    fontSize: 10,
    fontFamily: "Inter_300Light",
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  timeInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    height: 52,
  },
  timeInputText: {
    fontSize: FontSize.base,
    fontFamily: "Inter_400Regular",
  },
});
