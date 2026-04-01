import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useDispatch, useSelector } from "react-redux";
import LogoImage from "../assets/images/logo.png";
import { GradientButton } from "../components/ui/GradientButton";
import { ScreenWrapper } from "../components/ui/ScreenWrapper";
import { Brand } from "../constants/branding";
import { Colors, FontFamily, FontSize } from "../constants/theme";
import { usePremium } from "../hooks/usePremium";
import { useTheme } from "../hooks/useTheme";
import { AppDispatch, RootState } from "../store";
import { updateSubscriptionThunk } from "../store/slices/subscriptionSlice";

const FEATURES = [
  { icon: "notifications", label: "Unlimited Smart Reminders" },
  { icon: "calendar-today", label: "Monthly Calendar Heatmap" },
  { icon: "bar-chart", label: "Full Analytics & Hydration Score" },
  { icon: "local-bar", label: "Drink Type Hydration Multipliers" },
  { icon: "download", label: "CSV Export" },
  { icon: "add-circle", label: "Custom Drink Types" },
  { icon: "support-agent", label: "Priority Support" },
];

const PLANS = [
  {
    id: "monthly" as const,
    label: "Monthly",
    price: "$2.99",
    period: "/month",
    total: "$2.99/mo",
    highlight: false,
    badge: null,
  },
  {
    id: "yearly" as const,
    label: "Yearly",
    price: "$19.99",
    period: "/year",
    total: "$1.67/mo",
    highlight: true,
    badge: "Best Value — Save 44%",
  },
];

function AppLogo() {
  return (
    <View style={styles.animationContainer}>
      <Image
        source={LogoImage}
        style={styles.logoImage}
        resizeMode="contain"
      />
    </View>
  );
}

export default function SubscriptionScreen() {
  const theme = useTheme();
  const dispatch = useDispatch<AppDispatch>();
  const { isPremium, trialUsed } = usePremium();
  const uid = useSelector((state: RootState) => state.auth.uid);
  const subscriptionLoading = useSelector(
    (state: RootState) => state.subscription.loading,
  );

  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "yearly",
  );

  const handleSubscribe = async () => {
    if (!uid) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const result = await dispatch(
      updateSubscriptionThunk({ uid, plan: selectedPlan }),
    );
    if (updateSubscriptionThunk.fulfilled.match(result)) {
      Alert.alert(
        "Welcome to Pro! 🎉",
        `Your ${selectedPlan} plan is now active. Enjoy all ${Brand.appName} Pro features!`,
        [{ text: "Awesome!", onPress: () => router.back() }],
      );
    } else {
      Alert.alert(
        "Error",
        "Failed to activate subscription. Please try again.",
      );
    }
  };

  const handleRestore = () => {
    Alert.alert(
      "Restore Purchases",
      "No previous purchases found. If you believe this is an error, contact support.",
      [{ text: "OK" }],
    );
  };

  if (isPremium) {
    return (
      <ScreenWrapper
        edges={["top", "bottom", "left", "right"]}
        gradientColors={[Colors.darkNavy, Colors.mediumBlue]}
      >
        <View
          style={[styles.alreadyPro, { paddingTop: 24, paddingBottom: 32 }]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
          >
            <MaterialIcons name="close" size={24} color={Colors.offWhite} />
          </TouchableOpacity>
          <AppLogo />
          <Text style={styles.alreadyProTitle}>You're already Pro! ✨</Text>
          <Text style={styles.alreadyProDesc}>
            You have full access to all {Brand.appName} Pro features.
          </Text>
          <GradientButton
            label="Back to App"
            onPress={() => router.back()}
            style={{ marginTop: 32, width: 200 }}
          />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper
      edges={["top", "bottom", "left", "right"]}
      gradientColors={[Colors.darkNavy, "#2A4A63", Colors.mediumBlue]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: 16, paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={24} color={Colors.offWhite} />
        </TouchableOpacity>

        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
          <AppLogo />
          <Text style={styles.proTitle}>{`${Brand.appName} Pro`}</Text>
          <Text style={styles.proSubtitle}>
            Unlock the full power of your hydration journey
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <View style={styles.featuresList}>
            {FEATURES.map((feature, i) => (
              <Animated.View
                key={feature.label}
                entering={FadeInDown.delay(200 + i * 50).duration(400)}
                style={styles.featureRow}
              >
                <View style={styles.checkCircle}>
                  <MaterialIcons
                    name="check"
                    size={14}
                    color={Colors.darkNavy}
                  />
                </View>
                <MaterialIcons
                  name={feature.icon as any}
                  size={18}
                  color={Colors.lightBlue}
                  style={{ marginHorizontal: 8 }}
                />
                <Text style={styles.featureText}>{feature.label}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Plan Cards */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)}>
          <Text
            style={[styles.sectionLabel, { color: "rgba(247,248,240,0.7)" }]}
          >
            Choose Your Plan
          </Text>
          <View style={styles.plansRow}>
            {PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                onPress={() => {
                  setSelectedPlan(plan.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{ flex: 1 }}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.planCard,
                    selectedPlan === plan.id && styles.planCardSelected,
                    plan.highlight && styles.planCardHighlight,
                  ]}
                >
                  {plan.badge && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <Text style={styles.planLabel}>{plan.label}</Text>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                  <Text style={styles.planTotal}>{plan.total}</Text>
                  {selectedPlan === plan.id && (
                    <View style={styles.selectedCheck}>
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color={Colors.lightBlue}
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* CTA */}
        <Animated.View
          entering={FadeInDown.delay(800).duration(500)}
          style={styles.ctaSection}
        >
          <GradientButton
            label={
              trialUsed
                ? `Subscribe ${selectedPlan === "yearly" ? "$19.99/yr" : "$2.99/mo"}`
                : "Start 3-Day Free Trial"
            }
            onPress={handleSubscribe}
            loading={subscriptionLoading}
            style={styles.ctaButton}
          />

          <Text style={styles.ctaNote}>
            {trialUsed
              ? `Billed ${selectedPlan === "yearly" ? "annually" : "monthly"}. Cancel anytime.`
              : `Free for 3 days, then ${selectedPlan === "yearly" ? "$19.99/year" : "$2.99/month"}. Cancel anytime.`}
          </Text>
          <Text style={styles.ctaNote}>
            Billed via App Store / Google Play.
          </Text>

          <TouchableOpacity onPress={handleRestore} style={{ marginTop: 16 }}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 24,
  },
  closeBtn: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    marginBottom: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  animationContainer: {
    marginBottom: 16,
  },
  logoImage: {
    width: 130,
    height: 130,
    borderRadius: 30,
  },
  proTitle: {
    fontSize: 36,
    fontFamily: FontFamily.bold,
    color: Colors.offWhite,
    textAlign: "center",
    marginBottom: 8,
  },
  proSubtitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: "rgba(247,248,240,0.7)",
    textAlign: "center",
    lineHeight: 22,
  },
  featuresList: {
    marginBottom: 24,
    gap: 10,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.lightBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.offWhite,
    flex: 1,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    textAlign: "center",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  plansRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    position: "relative",
    overflow: "hidden",
  },
  planCardSelected: {
    borderColor: Colors.lightBlue,
    backgroundColor: "rgba(156,213,255,0.15)",
  },
  planCardHighlight: {
    borderColor: Colors.lightBlue + "60",
  },
  planBadge: {
    backgroundColor: Colors.lightBlue,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  planBadgeText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    color: Colors.darkNavy,
    textAlign: "center",
  },
  planLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: "rgba(247,248,240,0.7)",
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    color: Colors.offWhite,
  },
  planPeriod: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.light,
    color: "rgba(247,248,240,0.6)",
  },
  planTotal: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.lightBlue,
    marginTop: 6,
  },
  selectedCheck: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  ctaSection: {
    alignItems: "center",
  },
  ctaButton: {
    width: "100%",
    marginBottom: 12,
  },
  ctaNote: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.light,
    color: "rgba(247,248,240,0.55)",
    textAlign: "center",
    lineHeight: 18,
  },
  restoreText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: "rgba(247,248,240,0.5)",
    textDecorationLine: "underline",
  },
  alreadyPro: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  alreadyProTitle: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    color: Colors.offWhite,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  alreadyProDesc: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: "rgba(247,248,240,0.7)",
    textAlign: "center",
    lineHeight: 22,
  },
});
