import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useDispatch } from "react-redux";
import LogoImage from "../../assets/images/logo.png";
import { BorderRadius, Colors, FontFamily, FontSize } from "../../constants/theme";
import { AppDispatch } from "../../store";
import { setHasSeenOnboarding } from "../../store/slices/authSlice";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const slides = [
  {
    title: "Stay Hydrated\nEvery Day",
    subtitle:
      "Track your water intake effortlessly and build healthy hydration habits.",
    icon: "drop",
    gradient: [Colors.darkNavy, "#2A4A63"] as [string, string],
  },
  {
    title: "Track\nEvery Sip",
    subtitle:
      "Log water, juice, tea, coffee and more. See how different drinks hydrate you.",
    icon: "ring",
    gradient: ["#2A4A63", Colors.mediumBlue] as [string, string],
  },
  {
    title: "See Your\nProgress",
    subtitle:
      "Beautiful charts, streaks, and insights keep you motivated every day.",
    icon: "chart",
    gradient: [Colors.mediumBlue, Colors.lightBlue] as [string, string],
  },
];

const WaterDropIcon = ({ size = 100 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path
      d="M50 10 C50 10 20 45 20 65 C20 82 34 92 50 92 C66 92 80 82 80 65 C80 45 50 10 50 10Z"
      fill="rgba(156, 213, 255, 0.9)"
    />
    <Path
      d="M38 70 C36 62 40 55 46 52"
      stroke="rgba(255,255,255,0.6)"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

const RingIcon = ({ size = 100 }: { size?: number }) => {
  const r = size * 0.38;
  const stroke = size * 0.1;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={cx}
        cy={cx}
        r={r}
        stroke="rgba(156,213,255,0.3)"
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={cx}
        cy={cx}
        r={r}
        stroke="rgba(156,213,255,0.95)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * 0.3}
        transform={`rotate(-90, ${cx}, ${cx})`}
      />
    </Svg>
  );
};

const ChartIcon = ({ size = 100 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    {[
      { x: 10, h: 45 },
      { x: 24, h: 70 },
      { x: 38, h: 55 },
      { x: 52, h: 80 },
      { x: 66, h: 60 },
      { x: 80, h: 90 },
    ].map((bar, i) => (
      <Path
        key={i}
        d={`M${bar.x} 95 L${bar.x} ${95 - bar.h} Q${bar.x + 5} ${95 - bar.h - 2} ${bar.x + 10} ${95 - bar.h} L${bar.x + 10} 95 Z`}
        fill={`rgba(156, 213, 255, ${0.5 + i * 0.08})`}
      />
    ))}
  </Svg>
);

export default function OnboardingScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollX = useSharedValue(0);

  const goToSlide = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setCurrentIndex(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = () => {
    dispatch(setHasSeenOnboarding(true));
    router.replace("/(auth)/signup");
  };

  const handleLogin = () => {
    dispatch(setHasSeenOnboarding(true));
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {slides.map((slide, index) => (
          <LinearGradient
            key={index}
            colors={slide.gradient}
            style={[styles.slide, { width: SCREEN_WIDTH }]}
          >
            <View
              style={[styles.slideContent, { paddingTop: insets.top + 60 }]}
            >
              <View style={styles.iconContainer}>
                {slide.icon === "drop" && (
                  <Image
                    source={LogoImage}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                )}
                {slide.icon === "ring" && <RingIcon size={140} />}
                {slide.icon === "chart" && <ChartIcon size={140} />}
              </View>

              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          </LinearGradient>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: Colors.offWhite,
                    opacity: i === currentIndex ? 1 : 0.35,
                    width: i === currentIndex ? 24 : 8,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.15)"]}
            style={styles.nextButtonInner}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogin} style={{ marginTop: 16 }}>
          <Text style={styles.loginText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkNavy,
  },
  slide: {
    flex: 1,
    alignItems: "center",
  },
  slideContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 48,
  },
  logoImage: {
    width: 164,
    height: 164,
    borderRadius: 36,
  },
  title: {
    fontSize: 40,
    fontFamily: FontFamily.bold,
    color: Colors.offWhite,
    textAlign: "center",
    lineHeight: 48,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: "rgba(247, 248, 240, 0.75)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: 32,
    alignItems: "center",
    backgroundColor: "transparent",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    width: "100%",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  nextButtonInner: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  nextButtonText: {
    color: Colors.offWhite,
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
  },
  loginText: {
    color: "rgba(247, 248, 240, 0.6)",
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
  },
});
