import { useIsFocused } from "@react-navigation/native";
import type { ComponentType } from "react";

export function withTabUnmountOnBlur<P extends object>(Screen: ComponentType<P>) {
  function TabScreen(props: P) {
    const isFocused = useIsFocused();
    if (!isFocused) return null;
    return <Screen {...props} />;
  }

  const name = Screen.displayName ?? Screen.name ?? "Screen";
  TabScreen.displayName = `TabUnmountOnBlur(${name})`;

  return TabScreen;
}
