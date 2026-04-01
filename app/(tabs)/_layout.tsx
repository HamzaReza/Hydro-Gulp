import { MaterialIcons } from "@expo/vector-icons";
import { BlurTargetView, BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../hooks/useTheme";

const TAB_ICONS: Record<
  string,
  React.ComponentProps<typeof MaterialIcons>["name"]
> = {
  index: "water-drop",
  history: "history",
  analytics: "bar-chart",
  reminders: "notifications",
  profile: "person",
};

// ─── Single tab button ───────────────────────────────────────────────────────

function TabButton({
  icon,
  focused,
  onPress,
  accentColor,
  inactiveColor,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  focused: boolean;
  onPress: () => void;
  accentColor: string;
  inactiveColor: string;
}) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  React.useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.15, { damping: 12, stiffness: 200 }, () => {
        scale.value = withSpring(1, { damping: 12 });
      });
      glow.value = withTiming(1, { duration: 200 });
    } else {
      glow.value = withTiming(0, { duration: 200 });
    }
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.6 + glow.value * 0.4 }],
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={styles.tabButton}
      hitSlop={8}
    >
      <Animated.View
        style={[
          styles.activePill,
          { backgroundColor: accentColor + "22" },
          bgStyle,
        ]}
      />
      <Animated.View style={iconStyle}>
        <MaterialIcons
          name={icon}
          size={22}
          color={focused ? accentColor : inactiveColor}
        />
      </Animated.View>
    </Pressable>
  );
}

// ─── Custom tab bar ──────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: any) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const blurTargetRef = React.useRef<View | null>(null);
  const androidBlurProps =
    Platform.OS === "android"
      ? ({
          blurMethod: "dimezisBlurViewSdk31Plus",
          blurTarget: blurTargetRef,
        } as const)
      : {};

  return (
    <View
      style={[styles.tabBarOuter, { bottom: Math.max(insets.bottom, 16) + 4 }]}
      pointerEvents="box-none"
    >
      <View style={[styles.tabBarPill, { borderColor: theme.tabBarBorder }]}>
        {/* Blur + tinted backing */}
        <BlurTargetView
          ref={blurTargetRef}
          style={StyleSheet.absoluteFillObject}
        />
        <BlurView
          tint={theme.blurTint}
          intensity={70}
          {...androidBlurProps}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: theme.tabBar,
            borderRadius: 36,
          }}
        />

        {/* Tab buttons */}
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const icon = TAB_ICONS[route.name];
          if (!icon) return null;

          return (
            <TabButton
              key={route.key}
              icon={icon}
              focused={focused}
              accentColor={theme.accent}
              inactiveColor={theme.textSecondary + "70"}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    />
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const PILL_HEIGHT = 62;

const styles = StyleSheet.create({
  tabBarOuter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  tabBarPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: PILL_HEIGHT,
    paddingHorizontal: 10,
    borderRadius: 36,
    borderWidth: 1,
    overflow: "hidden",
    // shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 20,
      },
      android: { elevation: 12 },
    }),
    // width — not full-screen, feels floating
    width: 300,
  },
  tabButton: {
    flex: 1,
    height: PILL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  activePill: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  glowDot: {
    position: "absolute",
    bottom: 9,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
