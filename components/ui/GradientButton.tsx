import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, FontSize, BorderRadius, Colors } from '../../constants/theme';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
  hapticStyle?: Haptics.ImpactFeedbackStyle;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  label,
  onPress,
  style,
  textStyle,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  hapticStyle = Haptics.ImpactFeedbackStyle.Medium,
}) => {
  const theme = useTheme();

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(hapticStyle);
    onPress();
  };

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={[
          styles.ghostButton,
          {
            borderColor: theme.accent,
            backgroundColor: theme.card,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <View style={styles.row}>
            {icon}
            <Text
              style={[
                styles.ghostText,
                { color: theme.accent },
                icon ? { marginLeft: 8 } : undefined,
                textStyle,
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={[
          styles.ghostButton,
          {
            borderColor: Colors.error,
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.error} />
        ) : (
          <View style={styles.row}>
            {icon}
            <Text
              style={[
                styles.ghostText,
                { color: Colors.error },
                icon ? { marginLeft: 8 } : undefined,
                textStyle,
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.touchable, style]}
    >
      <LinearGradient
        colors={disabled ? ['#B0C4D8', '#C8DCF0'] : [Colors.mediumBlue, Colors.lightBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.row}>
            {icon}
            <Text
              style={[
                styles.primaryText,
                icon ? { marginLeft: 8 } : undefined,
                textStyle,
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    height: 56,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  ghostButton: {
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  primaryText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
    letterSpacing: 0.3,
  },
  ghostText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
