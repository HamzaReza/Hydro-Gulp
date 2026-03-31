import React, { useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Text,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { FontFamily, FontSize } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoint?: number; // height as fraction of screen (0-1)
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  snapPoint = 0.6,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const sheetHeight = SCREEN_HEIGHT * snapPoint;
  const translateY = useSharedValue(sheetHeight);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 120 });
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withSpring(sheetHeight, { damping: 20, stiffness: 120 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, sheetHeight]);

  const closeSheet = useCallback(() => {
    translateY.value = withSpring(sheetHeight, { damping: 20, stiffness: 120 });
    backdropOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  }, [sheetHeight, onClose]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > sheetHeight * 0.3) {
        runOnJS(closeSheet)();
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 120 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={closeSheet} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight + insets.bottom,
            backgroundColor: theme.background,
            borderColor: theme.cardBorder,
          },
          sheetStyle,
        ]}
      >
        <BlurView
          tint={theme.blurTint}
          intensity={80}
          style={StyleSheet.absoluteFillObject}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: theme.card, borderRadius: 28 },
          ]}
        />

        <GestureDetector gesture={panGesture}>
          <View style={styles.handle}>
            <View
              style={[styles.handleBar, { backgroundColor: theme.textSecondary + '60' }]}
            />
          </View>
        </GestureDetector>

        {title && (
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  handle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  title: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.semibold,
    textAlign: 'center',
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
});
