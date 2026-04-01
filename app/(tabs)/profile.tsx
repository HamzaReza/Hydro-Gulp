import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { AppLogoMark } from "../../components/ui/AppLogoMark";
import { GlassCard } from "../../components/ui/GlassCard";
import { GradientButton } from "../../components/ui/GradientButton";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import { withTabUnmountOnBlur } from "../../components/ui/withTabUnmountOnBlur";
import { Brand } from "../../constants/branding";
import { BorderRadius, Colors, FontFamily, FontSize } from "../../constants/theme";
import { usePremium } from "../../hooks/usePremium";
import { useTheme } from "../../hooks/useTheme";
import { AppDispatch, RootState } from "../../store";
import { deleteAccountThunk, logoutThunk } from "../../store/slices/authSlice";
import { updateProfileThunk } from "../../store/slices/profileSlice";
import { toggleTheme } from "../../store/slices/settingsSlice";

function Avatar({
  name,
  color,
  size = 72,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <LinearGradient
      colors={[color, color + "CC"]}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: size * 0.36 }]}>
        {initials}
      </Text>
    </LinearGradient>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
  destructive,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={styles.settingRow}
    >
      <MaterialIcons
        name={icon as any}
        size={20}
        color={destructive ? Colors.error : theme.accent}
        style={styles.settingIcon}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.settingTitle,
            { color: destructive ? Colors.error : theme.text },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.settingSubtitle, { color: theme.textSecondary }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right ||
        (onPress && (
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={theme.textSecondary}
          />
        ))}
    </TouchableOpacity>
  );
}

function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { isPremium, plan, expiryDate } = usePremium();

  const uid = useSelector((state: RootState) => state.auth.uid);
  const email = useSelector((state: RootState) => state.auth.email);
  const { name, avatarColor, goal, unit, wakeTime, sleepTime } = useSelector(
    (state: RootState) => state.profile,
  );
  const themeMode = useSelector((state: RootState) => state.settings.theme);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(name);
  const [editGoal, setEditGoal] = useState(String(goal));
  const [editUnit, setEditUnit] = useState<"ml" | "oz">(unit);
  const [editWake, setEditWake] = useState(wakeTime || "07:00");
  const [editSleep, setEditSleep] = useState(sleepTime || "23:00");
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!uid) return;
    const newGoal = parseInt(editGoal, 10);
    if (!editName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }
    if (!newGoal || newGoal < 500 || newGoal > 10000) {
      Alert.alert("Error", "Goal must be between 500 and 10000 ml.");
      return;
    }

    await dispatch(
      updateProfileThunk({
        uid,
        data: {
          name: editName.trim(),
          goal: newGoal,
          unit: editUnit,
          wakeTime: editWake,
          sleepTime: editSleep,
        },
      }),
    );

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditModalVisible(false);
  };


  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          setLogoutLoading(true);
          await dispatch(logoutThunk());
          setLogoutLoading(false);
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            if (uid) {
              await dispatch(deleteAccountThunk(uid));
            }
          },
        },
      ],
    );
  };

  const expiryStr = expiryDate
    ? new Date(expiryDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: theme.text }]}>Profile</Text>

        {/* Avatar & Name */}
        <GlassCard style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar name={name || email || "U"} color={avatarColor} />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={[styles.profileName, { color: theme.text }]}>
                {name || "Set your name"}
              </Text>
              <Text
                style={[styles.profileEmail, { color: theme.textSecondary }]}
              >
                {email}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditName(name);
                  setEditGoal(String(goal));
                  setEditUnit(unit);
                  setEditWake(wakeTime || "07:00");
                  setEditSleep(sleepTime || "23:00");
                  setEditModalVisible(true);
                }}
                style={[styles.editBtn, { borderColor: theme.accent }]}
              >
                <MaterialIcons name="edit" size={14} color={theme.accent} />
                <Text style={[styles.editBtnText, { color: theme.accent }]}>
                  Edit Profile
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.statsRow, { borderTopColor: theme.cardBorder }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {unit === "oz"
                  ? `${Math.round(goal * 0.033814 * 10) / 10}oz`
                  : `${goal}ml`}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Daily Goal
              </Text>
            </View>
            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.cardBorder },
              ]}
            />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {unit.toUpperCase()}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Unit
              </Text>
            </View>
            <View
              style={[
                styles.statDivider,
                { backgroundColor: theme.cardBorder },
              ]}
            />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {wakeTime || "–"}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Wake Up
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Subscription */}
        <GlassCard
          style={[
            styles.subscriptionCard,
            isPremium && { borderColor: Colors.lightBlue + "60" },
          ]}
        >
          {isPremium ? (
            <View>
              <View style={styles.subscriptionHeader}>
                <LinearGradient
                  colors={[Colors.mediumBlue, Colors.lightBlue]}
                  style={styles.proBadge}
                >
                  <Text style={styles.proBadgeText}>PRO ✨</Text>
                </LinearGradient>
                <View style={{ marginLeft: 12 }}>
                  <Text
                    style={[styles.subscriptionTitle, { color: theme.text }]}
                  >
                    {`${Brand.appName} Pro`}
                  </Text>
                  {expiryStr && (
                    <Text
                      style={[
                        styles.subscriptionDesc,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Active until {expiryStr}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <View>
              <Text style={[styles.subscriptionTitle, { color: theme.text }]}>
                HydrO: Gulp Free
              </Text>
              <Text
                style={[
                  styles.subscriptionDesc,
                  { color: theme.textSecondary },
                ]}
              >
                Upgrade to unlock all features
              </Text>
              <GradientButton
                label="Upgrade to Pro"
                icon={<AppLogoMark size={20} />}
                onPress={() => router.push("/subscription")}
                style={{ marginTop: 12 }}
              />
            </View>
          )}
        </GlassCard>

        {/* App Settings */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Preferences
        </Text>
        <GlassCard style={styles.settingsCard} padding={0}>
          <SettingsRow
            icon="dark-mode"
            title="Dark Mode"
            right={
              <Switch
                value={themeMode === "dark"}
                onValueChange={() => {
                  dispatch(toggleTheme());
                }}
                trackColor={{
                  false: theme.progressBackground,
                  true: theme.accent,
                }}
                thumbColor="#fff"
              />
            }
          />
        </GlassCard>

        {/* More */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>More</Text>
        <GlassCard style={styles.settingsCard} padding={0}>
          {[
            {
              icon: "star-rate",
              title: "Rate HydrO: Gulp",
              onPress: () => Alert.alert("Thank you!", "Rating coming soon."),
            },
            {
              icon: "share",
              title: "Share App",
              onPress: () => Alert.alert("Share", "Sharing coming soon."),
            },
            {
              icon: "privacy-tip",
              title: "Privacy Policy",
              onPress: () => Alert.alert("Privacy Policy", "Coming soon."),
            },
            {
              icon: "description",
              title: "Terms of Service",
              onPress: () => Alert.alert("Terms", "Coming soon."),
            },
          ].map((item, i, arr) => (
            <React.Fragment key={item.title}>
              <SettingsRow
                icon={item.icon}
                title={item.title}
                onPress={item.onPress}
              />
              {i < arr.length - 1 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.cardBorder },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </GlassCard>

        {/* Log Out */}
        <GradientButton
          label="Log Out"
          onPress={handleLogout}
          variant="ghost"
          loading={logoutLoading}
          style={{
            marginTop: 8,
            borderColor: Colors.error + "60",
            backgroundColor: "rgba(255,107,107,0.08)",
          }}
          textStyle={{ color: Colors.error }}
        />

        {/* Danger Zone */}
        <TouchableOpacity
          onPress={() => setDangerZoneOpen(!dangerZoneOpen)}
          style={styles.dangerZoneHeader}
        >
          <Text
            style={[styles.dangerZoneTitle, { color: theme.textSecondary }]}
          >
            Danger Zone
          </Text>
          <MaterialIcons
            name={dangerZoneOpen ? "expand-less" : "expand-more"}
            size={18}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        {dangerZoneOpen && (
          <GlassCard
            style={[styles.dangerCard, { borderColor: Colors.error + "30" }]}
          >
            <Text style={[styles.dangerDesc, { color: theme.textSecondary }]}>
              Permanently deletes your account and all associated data. This
              action cannot be undone.
            </Text>
            <GradientButton
              label="Delete Account"
              onPress={handleDeleteAccount}
              variant="danger"
              style={{ marginTop: 12 }}
            />
          </GlassCard>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View
          style={[styles.modalContainer, { backgroundColor: theme.background }]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Edit Profile
                </Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {[
                {
                  label: "Name",
                  value: editName,
                  onChange: setEditName,
                  placeholder: "Your name",
                  keyboardType: "default" as const,
                },
                {
                  label: "Daily Goal (ml)",
                  value: editGoal,
                  onChange: setEditGoal,
                  placeholder: "2000",
                  keyboardType: "number-pad" as const,
                },
                {
                  label: "Wake Up Time (HH:MM)",
                  value: editWake,
                  onChange: setEditWake,
                  placeholder: "07:00",
                  keyboardType: "numbers-and-punctuation" as const,
                },
                {
                  label: "Sleep Time (HH:MM)",
                  value: editSleep,
                  onChange: setEditSleep,
                  placeholder: "23:00",
                  keyboardType: "numbers-and-punctuation" as const,
                },
              ].map((field) => (
                <View key={field.label} style={styles.modalField}>
                  <Text style={[styles.modalLabel, { color: theme.text }]}>
                    {field.label}
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        borderColor: theme.inputBorder,
                        backgroundColor: theme.inputBackground,
                        color: theme.text,
                      },
                    ]}
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.textSecondary + "80"}
                    keyboardType={field.keyboardType}
                  />
                </View>
              ))}

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.text }]}>
                  Unit
                </Text>
                <View style={styles.unitToggle}>
                  {(["ml", "oz"] as const).map((u) => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setEditUnit(u)}
                      style={[
                        styles.unitBtn,
                        {
                          backgroundColor:
                            editUnit === u
                              ? theme.accent
                              : theme.inputBackground,
                          borderColor:
                            editUnit === u ? theme.accent : theme.inputBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.unitBtnText,
                          {
                            color:
                              editUnit === u ? "#fff" : theme.textSecondary,
                          },
                        ]}
                      >
                        {u.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <GradientButton
                label="Save Changes"
                onPress={handleSaveProfile}
                style={{ marginTop: 24 }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20 },
  screenTitle: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    marginBottom: 20,
  },
  profileCard: { marginBottom: 16, borderRadius: 24, padding: 0 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    color: "#fff",
    fontFamily: FontFamily.bold,
  },
  profileName: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    marginBottom: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  editBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
  },
  statDivider: {
    width: 1,
    height: "100%",
  },
  subscriptionCard: { marginBottom: 24, borderRadius: 20 },
  subscriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  proBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  proBadgeText: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  subscriptionTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
  },
  subscriptionDesc: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.semibold,
    marginBottom: 12,
    marginTop: 8,
  },
  settingsCard: { marginBottom: 16, borderRadius: 20 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingIcon: { marginRight: 12 },
  settingTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
  },
  settingSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.light,
    marginTop: 1,
  },
  divider: { height: 1, marginHorizontal: 16 },
  dangerZoneHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 6,
    marginTop: 8,
  },
  dangerZoneTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
  },
  dangerCard: { borderRadius: 16, borderWidth: 1, marginTop: 4 },
  dangerDesc: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    lineHeight: 20,
  },
  modalContainer: { flex: 1 },
  modalScroll: { padding: 24 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
  },
  modalField: { marginBottom: 16 },
  modalLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    height: 52,
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
  },
  unitToggle: {
    flexDirection: "row",
    gap: 12,
  },
  unitBtn: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  unitBtnText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
  },
});

export default withTabUnmountOnBlur(ProfileScreen);
