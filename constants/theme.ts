export const Colors = {
  darkNavy: '#355872',
  mediumBlue: '#7AAACE',
  lightBlue: '#9CD5FF',
  offWhite: '#F7F8F0',
  darkBackground: '#1A2E3D',
  error: '#FF6B6B',
  success: '#4CAF50',
  warning: '#FFC107',
};

export const LightTheme = {
  background: '#F7F8F0',
  backgroundSecondary: '#EBF4FD',
  card: 'rgba(255, 255, 255, 0.78)',
  cardBorder: 'rgba(53, 88, 114, 0.14)',
  text: '#355872',
  textSecondary: '#7AAACE',
  accent: '#7AAACE',
  accentLight: '#9CD5FF',
  tabBar: 'rgba(247, 248, 240, 0.85)',
  tabBarBorder: 'rgba(122, 170, 206, 0.2)',
  inputBackground: 'rgba(154, 213, 255, 0.15)',
  inputBorder: 'rgba(122, 170, 206, 0.4)',
  progressBackground: 'rgba(154, 213, 255, 0.25)',
  progressFill: '#7AAACE',
  gradientStart: '#F7F8F0',
  gradientEnd: '#D6EEFF',
  shadow: 'rgba(53, 88, 114, 0.15)',
  overlay: 'rgba(247, 248, 240, 0.9)',
  destructive: '#FF6B6B',
  blurTint: 'light' as const,
  isDark: false,
};

export const DarkTheme = {
  background: '#1A2E3D',
  backgroundSecondary: '#243D52',
  card: 'rgba(36, 61, 82, 0.72)',
  cardBorder: 'rgba(156, 213, 255, 0.22)',
  text: '#F7F8F0',
  textSecondary: '#9CD5FF',
  accent: '#9CD5FF',
  accentLight: '#9CD5FF',
  tabBar: 'rgba(26, 46, 61, 0.85)',
  tabBarBorder: 'rgba(154, 213, 255, 0.15)',
  inputBackground: 'rgba(53, 88, 114, 0.4)',
  inputBorder: 'rgba(154, 213, 255, 0.25)',
  progressBackground: 'rgba(53, 88, 114, 0.5)',
  progressFill: '#9CD5FF',
  gradientStart: '#1A2E3D',
  gradientEnd: '#243D52',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(26, 46, 61, 0.9)',
  destructive: '#FF6B6B',
  blurTint: 'dark' as const,
  isDark: true,
};

export type Theme = typeof LightTheme;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 48,
  display: 64,
};
