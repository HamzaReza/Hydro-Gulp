import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Brand } from "../../constants/branding";
import { BorderRadius, Colors, FontFamily, FontSize } from "../../constants/theme";
import { useTheme } from "../../hooks/useTheme";
import { AppLogoMark } from "./AppLogoMark";

interface PremiumLockProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export const PremiumLock: React.FC<PremiumLockProps> = ({
  title = Brand.proName + " Feature",
  description = Brand.proUnlockShort,
  children,
}) => {
  const theme = useTheme();

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/subscription");
  };

  return (
    <View style={styles.wrapper}>
      {children && (
        <View style={styles.blurredContent}>
          {children}
          <BlurView
            tint={theme.blurTint}
            intensity={20}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      )}
      <View style={styles.overlay}>
        <BlurView
          tint={theme.blurTint}
          intensity={60}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={StyleSheet.absoluteFillObject} />
        <View style={styles.content}>
          <LinearGradient
            colors={[Colors.mediumBlue, Colors.lightBlue]}
            style={styles.iconCircle}
          >
            <MaterialIcons name="lock" size={32} color="#fff" />
          </LinearGradient>

          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {description}
          </Text>

          <TouchableOpacity onPress={handleUpgrade} activeOpacity={0.85}>
            <LinearGradient
              colors={[Colors.mediumBlue, Colors.lightBlue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <AppLogoMark size={22} style={styles.buttonLogo} />
              <Text style={styles.buttonText}>{Brand.proCta}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  blurredContent: {
    flex: 1,
    borderRadius: BorderRadius.lg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    padding: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
  },
  buttonLogo: {
    marginRight: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
  },
});
