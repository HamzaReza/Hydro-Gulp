import { useSelector } from 'react-redux';
import { useColorScheme } from "react-native";
import { RootState } from '../store';
import { LightTheme, DarkTheme, Theme } from '../constants/theme';

export const useTheme = (): Theme => {
  const themePreference = useSelector((state: RootState) => state.settings.theme);
  const systemColorScheme = useColorScheme();
  const resolvedMode =
    themePreference === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : themePreference;
  return resolvedMode === 'dark' ? DarkTheme : LightTheme;
};
