import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet } from "react-native";
import LOGO from "../../assets/images/logo.png";
import { Brand } from "../../constants/branding";

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/** Small app logo for inline use (buttons, empty states, titles). */
export function AppLogoMark({ size = 22, style }: Props) {
  return (
    <Image
      source={LOGO}
      accessibilityLabel={Brand.appName}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size * 0.2 },
        style,
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
