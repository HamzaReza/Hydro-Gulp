import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { LightTheme, DarkTheme, Theme } from '../constants/theme';

export const useTheme = (): Theme => {
  const themeMode = useSelector((state: RootState) => state.settings.theme);
  return themeMode === 'dark' ? DarkTheme : LightTheme;
};
