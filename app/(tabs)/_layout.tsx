import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../hooks/useTheme";

const TAB_ITEMS = [
  { name: "index", label: "Home", icon: "water-drop" as const },
  { name: "history", label: "History", icon: "history" as const },
  { name: "analytics", label: "Analytics", icon: "bar-chart" as const },
  { name: "reminders", label: "Reminders", icon: "notifications" as const },
  { name: "profile", label: "Profile", icon: "person" as const },
];

function TabBarIcon({
  name,
  label,
  focused,
  color,
}: {
  name: any;
  label: string;
  focused: boolean;
  color: string;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.85, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
  };

  return (
    <Animated.View style={[styles.tabItem, animStyle]}>
      <MaterialIcons name={name} size={22} color={color} />
      <Text
        style={[
          styles.tabLabel,
          {
            color,
            fontFamily: focused ? "Inter_600SemiBold" : "Inter_400Regular",
          },
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: insets.bottom + 12,
          left: 20,
          right: 20,
          height: 64,
          borderRadius: 24,
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: "transparent",
          shadowColor: "transparent",
        },
        tabBarBackground: () => (
          <View style={[styles.tabBarBg, { borderColor: theme.tabBarBorder }]}>
            <BlurView
              tint={theme.blurTint}
              intensity={80}
              style={StyleSheet.absoluteFillObject}
            />
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: theme.tabBar, borderRadius: 24 },
              ]}
            />
          </View>
        ),
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary + "80",
        tabBarShowLabel: false,
        tabBarItemStyle: {
          height: 64,
        },
      })}
    >
      {TAB_ITEMS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <TabBarIcon
                name={tab.icon}
                label={tab.label}
                focused={focused}
                color={color}
              />
            ),
          }}
          listeners={{
            tabPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            },
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBg: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
