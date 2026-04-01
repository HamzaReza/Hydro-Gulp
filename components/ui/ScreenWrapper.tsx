import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../hooks/useTheme";

interface ScreenWrapperProps {
  children: React.ReactNode;
  /**
   * Which edges SafeAreaView should inset.
   * Tab screens: ['top','left','right'] — bottom is handled by the ScrollView's paddingBottom.
   * Auth/modal screens: ['top','bottom','left','right'] — full inset, no tab bar.
   */
  edges?: Edge[];
  /**
   * Override the gradient colours (e.g. auth screens always use dark navy).
   * Defaults to the current theme's gradientStart → gradientEnd.
   */
  gradientColors?: readonly [string, string, ...string[]];
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  edges = ["top", "left", "right"],
  gradientColors,
}) => {
  const theme = useTheme();
  const colors =
    gradientColors ?? ([theme.gradientStart, theme.gradientEnd] as const);

  return (
    <View style={styles.root}>
      {/*
       * translucent + transparent background makes the status bar icons float
       * over the gradient — the bar area becomes the same colour as the screen.
       * StatusBar style (light/dark icons) matches the theme.
       */}
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      {/* Gradient fills the FULL screen, including behind the status bar */}
      <LinearGradient colors={colors} style={StyleSheet.absoluteFillObject} />

      {/* SafeAreaView keeps all interactive content within safe bounds */}
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
});
