import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { GradientButton } from "../../components/ui/GradientButton";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import { BorderRadius, Colors, FontSize } from "../../constants/theme";
import { AppDispatch, RootState } from "../../store";
import { clearError, resetPasswordThunk } from "../../store/slices/authSlice";

export default function ForgotPasswordScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, resetEmailSent } = useSelector(
    (state: RootState) => state.auth,
  );

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleReset = async () => {
    dispatch(clearError());
    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");
    dispatch(resetPasswordThunk(email.trim()));
  };

  if (resetEmailSent) {
    return (
      <ScreenWrapper
        edges={["top", "bottom", "left", "right"]}
        gradientColors={[Colors.darkNavy, "#243D52"]}
      >
        <View style={[styles.content, { paddingTop: 40 }]}>
          <View style={styles.successContainer}>
            <LinearGradient
              colors={[Colors.mediumBlue, Colors.lightBlue]}
              style={styles.successIcon}
            >
              <MaterialIcons name="mark-email-read" size={40} color="#fff" />
            </LinearGradient>
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successText}>
              We sent a password reset link to{"\n"}
              <Text style={{ color: Colors.lightBlue }}>{email}</Text>
            </Text>
            <GradientButton
              label="Back to Sign In"
              onPress={() => router.replace("/(auth)/login")}
              style={{ marginTop: 32 }}
            />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper
      edges={["top", "bottom", "left", "right"]}
      gradientColors={[Colors.darkNavy, "#243D52"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={[styles.content, { paddingTop: 32, paddingBottom: 32 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={Colors.offWhite}
            />
          </TouchableOpacity>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a link to reset your password.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  emailError ? styles.inputError : undefined,
                ]}
              >
                <MaterialIcons
                  name="email"
                  size={18}
                  color={Colors.mediumBlue}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(247,248,240,0.4)"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setEmailError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
              </View>
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <MaterialIcons
                  name="error-outline"
                  size={16}
                  color={Colors.error}
                />
                <Text style={[styles.errorText, { marginLeft: 6, flex: 1 }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            <GradientButton
              label="Send Reset Link"
              onPress={handleReset}
              loading={loading}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: Colors.offWhite,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FontSize.base,
    fontFamily: "Inter_400Regular",
    color: "rgba(247,248,240,0.65)",
    marginBottom: 32,
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(247,248,240,0.8)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    fontFamily: "Inter_400Regular",
    color: Colors.offWhite,
  },
  errorText: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
    color: Colors.error,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    padding: 12,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.offWhite,
    marginBottom: 12,
    textAlign: "center",
  },
  successText: {
    fontSize: FontSize.base,
    fontFamily: "Inter_400Regular",
    color: "rgba(247,248,240,0.7)",
    textAlign: "center",
    lineHeight: 24,
  },
});
