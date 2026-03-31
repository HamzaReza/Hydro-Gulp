import { Brand } from "@/constants/branding";
import { router } from "expo-router";
import React from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { AppLogoMark } from "../../components/ui/AppLogoMark";
import { GradientButton } from "../../components/ui/GradientButton";
import { ScreenWrapper } from "../../components/ui/ScreenWrapper";
import { BorderRadius, Colors, FontSize } from "../../constants/theme";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  return (
    <ScreenWrapper
      edges={["top", "bottom", "left", "right"]}
      gradientColors={[Colors.darkNavy, "#243D52", Colors.mediumBlue]}
    >
      <View style={[styles.content, { paddingTop: 40, paddingBottom: 32 }]}>
        <View style={styles.heroSection}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>{Brand.appName}</Text>
          <Text style={styles.tagline}>Your daily hydration companion</Text>
        </View>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <AppLogoMark size={22} style={styles.featureLeadLogo} />
            <Text style={styles.featureText}>Track every sip with ease</Text>
          </View>
          {[
            "📊 Beautiful charts & insights",
            "🔥 Build daily streaks",
            "⏰ Smart reminders",
          ].map((f) => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttons}>
          <GradientButton
            label="Get Started"
            onPress={() => router.push("/(auth)/signup")}
            style={{ marginBottom: 12 }}
          />
          <GradientButton
            label="Sign In"
            onPress={() => router.push("/(auth)/login")}
            variant="ghost"
            style={{
              borderColor: "rgba(255,255,255,0.4)",
              backgroundColor: "rgba(255,255,255,0.1)",
            }}
            textStyle={{ color: Colors.offWhite }}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "space-between",
  },
  heroSection: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  logoImage: {
    width: 180,
    height: 180,
    borderRadius: 36,
  },
  appName: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: Colors.offWhite,
    marginTop: 16,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FontSize.base,
    fontFamily: "Inter_300Light",
    color: "rgba(247, 248, 240, 0.7)",
    marginTop: 8,
  },
  features: {
    marginBottom: 32,
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    gap: 12,
  },
  featureLeadLogo: {
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    color: Colors.offWhite,
    fontSize: FontSize.base,
    fontFamily: "Inter_400Regular",
  },
  buttons: {
    gap: 12,
  },
});
