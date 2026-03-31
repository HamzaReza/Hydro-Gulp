import { BlurView } from "expo-blur";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  padding?: number;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 60,
  padding = 16,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.root, style]}>
      <View style={[styles.glassLayer, { borderColor: theme.cardBorder }]}>
        <BlurView
          tint={theme.blurTint}
          intensity={intensity}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: theme.card },
          ]}
        />
        <View style={{ padding }}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  glassLayer: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
});
