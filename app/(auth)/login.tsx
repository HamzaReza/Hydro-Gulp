import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useDispatch, useSelector } from "react-redux";
import { GradientButton } from "../../components/ui/GradientButton";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import { BorderRadius, Colors, FontSize } from "../../constants/theme";
import { AppDispatch, RootState } from "../../store";
import { clearError, loginThunk } from "../../store/slices/authSlice";

export default function LoginScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const shakeX = useSharedValue(0);
  const passwordRef = useRef<TextInput>(null);

  const shakeForm = () => {
    shakeX.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  };

  const formStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const validate = (): boolean => {
    let valid = true;
    if (!email.trim()) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else {
      setPasswordError("");
    }

    return valid;
  };

  const handleLogin = async () => {
    dispatch(clearError());
    if (!validate()) {
      shakeForm();
      return;
    }

    const result = await dispatch(
      loginThunk({ email: email.trim(), password }),
    );
    if (loginThunk.rejected.match(result)) {
      shakeForm();
    }
  };

  return (
    <ScreenWrapper
      edges={["top", "bottom", "left", "right"]}
      gradientColors={[Colors.darkNavy, "#243D52"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: 32, paddingBottom: 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          <Text style={styles.title}>Welcome back 👋</Text>
          <Text style={styles.subtitle}>
            Sign in to continue your hydration journey
          </Text>

          <Animated.View style={[styles.form, formStyle]}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
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
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  passwordError ? styles.inputError : undefined,
                ]}
              >
                <MaterialIcons
                  name="lock"
                  size={18}
                  color={Colors.mediumBlue}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(247,248,240,0.4)"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setPasswordError("");
                  }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={18}
                    color="rgba(247,248,240,0.5)"
                  />
                </TouchableOpacity>
              </View>
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <MaterialIcons
                  name="error-outline"
                  size={16}
                  color={Colors.error}
                />
                <Text style={[styles.errorText, { marginLeft: 6 }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <GradientButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={{ marginTop: 8 }}
            />
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/signup")}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
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
  eyeButton: {
    padding: 4,
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
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
    color: Colors.lightBlue,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_400Regular",
    color: "rgba(247,248,240,0.6)",
  },
  linkText: {
    fontSize: FontSize.sm,
    fontFamily: "Inter_600SemiBold",
    color: Colors.lightBlue,
  },
});
