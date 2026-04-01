import { Brand } from "@/constants/branding";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useDispatch, useSelector } from "react-redux";
import LogoImage from "../../assets/images/logo.png";
import { AppLogoMark } from "../../components/ui/AppLogoMark";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import {
  BorderRadius,
  Colors,
  FontFamily,
  FontSize,
} from "../../constants/theme";
import { AppDispatch, RootState } from "../../store";
import { clearError, googleSignInThunk } from "../../store/slices/authSlice";

export default function WelcomeScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const shakeX = useSharedValue(0);

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

  const handleGoogleSignIn = async () => {
    dispatch(clearError());
    const result = await dispatch(googleSignInThunk());
    if (googleSignInThunk.rejected.match(result)) {
      shakeForm();
    }
  };

  return (
    <ScreenWrapper
      edges={["top", "bottom", "left", "right"]}
      gradientColors={[Colors.darkNavy, "#243D52", Colors.mediumBlue]}
    >
      <View style={[styles.content, { paddingTop: 40, paddingBottom: 32 }]}>
        <View style={styles.heroSection}>
          <Image
            source={LogoImage}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>{Brand.appName}</Text>
          <Text style={styles.tagline}>Your daily hydration companion</Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <AppLogoMark size={22} style={styles.featureLeadLogo} />
            <Text style={styles.featureText}>Track every sip with ease</Text>
          </View>
          {[
            "📊 Beautiful charts & insights",
            "🔥 Build daily streaks",
            "⏰ Smart reminders",
          ].map((f) => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <Animated.View style={[styles.buttons, formStyle]}>
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

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <FontAwesome name="google" size={18} color="#DB4437" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "space-between",
  },
  heroSection: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  logoImage: {
    width: 180,
    height: 180,
    borderRadius: 36,
  },
  appName: {
    fontSize: 48,
    fontFamily: FontFamily.bold,
    color: Colors.offWhite,
    marginTop: 16,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.light,
    color: "rgba(247, 248, 240, 0.7)",
    marginTop: 8,
  },
  features: {
    marginBottom: 32,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    gap: 12,
  },
  featureLeadLogo: {
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    color: Colors.offWhite,
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
  },
  buttons: {
    gap: 12,
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
  errorText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.error,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: BorderRadius.md,
    height: 52,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  googleButtonText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
    color: "#1F1F1F",
  },
});
