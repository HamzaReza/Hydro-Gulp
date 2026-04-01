import { BlurTargetView, BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
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
  const blurTargetRef = React.useRef<View | null>(null);
  const androidBlurProps =
    Platform.OS === "android"
      ? ({
          blurMethod: "dimezisBlurViewSdk31Plus",
          blurTarget: blurTargetRef,
        } as const)
      : {};

  return (
    <View style={[styles.root, style]}>
      <View style={[styles.glassLayer, { borderColor: theme.cardBorder }]}>
        <BlurTargetView
          ref={blurTargetRef}
          style={StyleSheet.absoluteFillObject}
        />
        <BlurView
          tint={theme.blurTint}
          intensity={intensity}
          style={StyleSheet.absoluteFillObject}
          {...androidBlurProps}
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
