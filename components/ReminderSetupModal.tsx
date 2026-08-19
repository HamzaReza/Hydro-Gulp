import { MaterialIcons } from "@expo/vector-icons";
import { doc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { DEMO_MODE } from "../constants/demoMode";
import { DEFAULT_QUICK_ADD_AMOUNTS } from "../constants/drinks";
import { BorderRadius, FontFamily, FontSize } from "../constants/theme";
import { db } from "../firebase";
import { useHydration } from "../hooks/useHydration";
import { usePremium } from "../hooks/usePremium";
import { useTheme } from "../hooks/useTheme";
import {
  exactAlarmsAllowed,
  notificationPermissionGranted,
  openExactAlarmSettings,
  requestNotificationPermissions,
  rescheduleAllReminders,
  scheduleReminder,
} from "../services/notifications";
import { AppDispatch, RootState } from "../store";
import {
  addReminder,
  FREE_REMINDER_LIMIT,
  setLastReminderPromptDate,
  setNotificationsEnabled,
} from "../store/slices/settingsSlice";
import { getTodayString } from "../utils/dateUtils";
import { BottomSheet } from "./ui/BottomSheet";
import { GradientButton } from "./ui/GradientButton";

const DEFAULT_REMINDER_TIME = "12:00";

export function ReminderSetupModal() {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();

  const { isPremium } = usePremium();
  const { todayLogs } = useHydration();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const reminders = useSelector((state: RootState) => state.settings.reminders);
  const lastReminderPromptDate = useSelector(
    (state: RootState) => state.settings.lastReminderPromptDate,
  );
  const presets = useSelector(
    (state: RootState) =>
      state.profile.quickAddPresets ?? DEFAULT_QUICK_ADD_AMOUNTS,
  );

  // Live OS permission state — re-checked on every mount (the home tab
  // remounts on focus via withTabUnmountOnBlur), never cached across days.
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    if (DEMO_MODE) return;
    notificationPermissionGranted().then(setPermissionGranted);
  }, []);

  const today = getTodayString();
  const hasLoggedToday = todayLogs.length > 0;
  const alreadyPromptedToday = lastReminderPromptDate === today;
  const shouldShow =
    !DEMO_MODE &&
    permissionGranted === false &&
    hasLoggedToday &&
    !alreadyPromptedToday;

  const dismiss = () => {
    dispatch(setLastReminderPromptDate(today));
  };

  const handleEnable = async () => {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert(
        "Notifications Disabled",
        "No problem — you can turn on reminders anytime from Settings.",
        [{ text: "OK", onPress: dismiss }],
      );
      return;
    }

    dispatch(setNotificationsEnabled(true));

    // Existing users may already be at the free-tier reminder cap (e.g. set
    // up before this prompt existed) — activate what they already have
    // instead of pushing them over the limit with a new one.
    if (!isPremium && reminders.length >= FREE_REMINDER_LIMIT) {
      await rescheduleAllReminders(reminders, presets, true);
    } else {
      const reminder = {
        id: `reminder-${Date.now()}`,
        time: DEFAULT_REMINDER_TIME,
        enabled: true,
        label: "Time to hydrate!",
        smartReminder: false,
      };
      await scheduleReminder(reminder, presets);
      dispatch(addReminder(reminder));
      if (uid) {
        await setDoc(
          doc(db, "users", uid, "reminders", reminder.id),
          reminder,
        ).catch(() => {});
      }
    }

    if (!(await exactAlarmsAllowed())) {
      Alert.alert(
        "Precise Reminders",
        "Allow 'Alarms & reminders' so your hydration reminder arrives exactly on time. Without it, it may be delayed by the system.",
        [
          { text: "Not now", style: "cancel", onPress: dismiss },
          {
            text: "Allow",
            onPress: () => {
              openExactAlarmSettings();
              dismiss();
            },
          },
        ],
      );
      return;
    }

    dismiss();
  };

  return (
    <BottomSheet
      visible={shouldShow}
      onClose={dismiss}
      title="Never Forget to Hydrate"
      snapPoint={0.48}
    >
      <View style={styles.content}>
        <View
          style={[styles.iconCircle, { backgroundColor: theme.accent + "20" }]}
        >
          <MaterialIcons
            name="notifications-active"
            size={40}
            color={theme.accent}
          />
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          We&apos;ll send you a gentle reminder every day to keep your streak
          going. Fine-tune it anytime in Settings.
        </Text>

        <GradientButton
          label="Enable Reminders"
          onPress={handleEnable}
          style={{ marginTop: 24 }}
        />
        <TouchableOpacity style={styles.skipButton} onPress={dismiss}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>
            Maybe later
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: BorderRadius.md * 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    lineHeight: 22,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 16,
  },
  skipText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.medium,
  },
});
