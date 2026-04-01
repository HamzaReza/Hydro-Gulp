import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useDispatch, useSelector } from "react-redux";
import { GradientButton } from "../../components/ui/GradientButton";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import { BorderRadius, Colors, FontFamily, FontSize } from "../../constants/theme";
import { AppDispatch, RootState } from "../../store";
import {
  checkEmailVerifiedThunk,
  clearError,
  logoutThunk,
  resendVerificationEmailThunk,
} from "../../store/slices/authSlice";

const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { email, loading, error } = useSelector(
    (state: RootState) => state.auth
  );

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  const iconScale = useSharedValue(1);
  const iconOpacity = useSharedValue(1);

  useEffect(() => {
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
    iconOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    dispatch(clearError());
    setResendSuccess(false);
    const result = await dispatch(resendVerificationEmailThunk());
    if (resendVerificationEmailThunk.fulfilled.match(result)) {
      setResendSuccess(true);
      setResendCooldown(RESEND_COOLDOWN);
    }
  };

  const handleContinue = async () => {
    dispatch(clearError());
    const result = await dispatch(checkEmailVerifiedThunk());
    if (checkEmailVerifiedThunk.fulfilled.match(result)) {
      router.replace("/(tabs)");
    }
  };

  const handleSignOut = async () => {
    await dispatch(logoutThunk());
    router.replace("/(auth)/welcome");
  };

  return (
    <ScreenWrapper
      edges={["top", "bottom", "left", "right"]}
      gradientColors={[Colors.darkNavy, "#243D52"]}
    >
      <View style={styles.container}>
        {/* Icon */}
        <Animated.View style={[styles.iconWrapper, iconStyle]}>
          <MaterialIcons name="mark-email-unread" size={64} color={Colors.lightBlue} />
        </Animated.View>

        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to
        </Text>
        <Text style={styles.email}>{email}</Text>
        <Text style={styles.instructions}>
          Click the link in the email to verify your account, then tap{" "}
          <Text style={styles.bold}>Continue</Text> below.
        </Text>

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={16} color={Colors.error} />
            <Text style={[styles.errorText, { marginLeft: 6, flex: 1 }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Resend success */}
        {resendSuccess && !error ? (
          <View style={styles.successBanner}>
            <MaterialIcons name="check-circle-outline" size={16} color={Colors.success} />
            <Text style={[styles.successText, { marginLeft: 6, flex: 1 }]}>
              Verification email sent! Check your inbox.
            </Text>
          </View>
        ) : null}

        <GradientButton
          label="Continue →"
          onPress={handleContinue}
          loading={loading}
          style={{ marginTop: 8 }}
        />

        {/* Resend */}
        <TouchableOpacity
          onPress={handleResend}
          disabled={resendCooldown > 0 || loading}
          style={styles.resendButton}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.lightBlue} />
          ) : (
            <Text
              style={[
                styles.resendText,
                resendCooldown > 0 && styles.resendDisabled,
              ]}
            >
              {resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : "Resend verification email"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <MaterialIcons
            name="logout"
            size={14}
            color="rgba(247,248,240,0.4)"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  iconWrapper: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(156,213,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "rgba(156,213,255,0.25)",
  },
  title: {
    fontSize: FontSize.xxl,
    fontFamily: FontFamily.bold,
    color: Colors.offWhite,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: "rgba(247,248,240,0.65)",
    textAlign: "center",
    marginTop: 4,
  },
  email: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
    color: Colors.lightBlue,
    textAlign: "center",
  },
  instructions: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: "rgba(247,248,240,0.55)",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  bold: {
    fontFamily: FontFamily.semibold,
    color: "rgba(247,248,240,0.75)",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    padding: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
    width: "100%",
  },
  errorText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.error,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    padding: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(76,175,80,0.3)",
    width: "100%",
  },
  successText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.success,
  },
  resendButton: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.lightBlue,
  },
  resendDisabled: {
    color: "rgba(156,213,255,0.4)",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: "rgba(247,248,240,0.4)",
  },
});
