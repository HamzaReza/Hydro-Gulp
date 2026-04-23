import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useFonts } from "expo-font";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { setBackgroundColorAsync } from "expo-system-ui";
import * as Updates from "expo-updates";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import React, { useCallback, useEffect, useMemo } from "react";
import { ActivityIndicator, AppState, StyleSheet, useColorScheme, View } from "react-native";
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider, useDispatch, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import SpaceGroteskBold from "../assets/fonts/SpaceGrotesk-Bold.ttf";
import SpaceGroteskMedium from "../assets/fonts/SpaceGrotesk-Medium.ttf";
import SpaceGroteskRegular from "../assets/fonts/SpaceGrotesk-Regular.ttf";
import SpaceGroteskSemiBold from "../assets/fonts/SpaceGrotesk-SemiBold.ttf";
import { Colors, DarkTheme as AppDarkTheme, LightTheme } from "../constants/theme";
import { auth, db } from "../firebase";
import { AppDispatch, persistor, RootState, store } from "../store";
import { clearUser, setUser } from "../store/slices/authSlice";
import { setGoal, setUnit } from "../store/slices/hydrationSlice";
import { fetchProfileThunk } from "../store/slices/profileSlice";
import { fetchRemindersThunk } from "../store/slices/settingsSlice";
import { setSubscription, syncRevenueCatStatusThunk } from "../store/slices/subscriptionSlice";
import {
  configureRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
} from "../services/revenuecat";

SplashScreen.preventAutoHideAsync();

// Configure RevenueCat before any user interaction
configureRevenueCat();

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
});

function AuthListener({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, hasSeenOnboarding } = useSelector(
    (state: RootState) => state.auth,
  );
  const segments = useSegments();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        dispatch(
          setUser({
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName,
          }),
        );

        // Link this session to the app user in RevenueCat.
        // Alias = uid+email so subscription is tied to both the app account
        // and the store account (Google/Apple).
        try {
          await loginRevenueCat(user.uid);
        } catch {
          // Non-fatal — RC will stay in anonymous mode offline
        }

        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            dispatch(fetchProfileThunk(user.uid));
            dispatch(fetchRemindersThunk(user.uid));
            if (data.goal) dispatch(setGoal(data.goal));
            if (data.unit) dispatch(setUnit(data.unit));

            // Seed Redux from Firestore cache immediately so the UI isn't blank
            const premiumExpiry =
              data.premiumExpiry instanceof Timestamp
                ? data.premiumExpiry.toMillis()
                : null;
            dispatch(
              setSubscription({
                isPremium: data.isPremium || false,
                plan: data.premiumPlan || null,
                expiryDate: premiumExpiry,
              }),
            );

            // Then fetch the live entitlement from RevenueCat and reconcile.
            // This ensures the app reflects the real store status even if
            // Firestore was stale (e.g. subscription expired, or restored on
            // a new device).
            dispatch(syncRevenueCatStatusThunk(user.uid));
          }
        } catch {
          // Offline — use cached Redux state
        }
      } else {
        dispatch(clearUser());
        // Revert RevenueCat to anonymous on sign-out
        try {
          await logoutRevenueCat();
        } catch {
          // Safe to ignore
        }
      }
    });

    return unsubscribe;
  }, [dispatch]);

  // Re-sync entitlement whenever the app comes back to the foreground
  // (handles cases like a subscription expiring while the app was backgrounded).
  const uid = useSelector((state: RootState) => state.auth.uid);
  useEffect(() => {
    if (!uid) return;
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        dispatch(syncRevenueCatStatusThunk(uid));
      }
    });
    return () => sub.remove();
  }, [dispatch, uid]);

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (isAuthenticated && (inAuthGroup || inOnboarding)) {
      router.replace("/(tabs)");
    } else if (!isAuthenticated && !inAuthGroup && !inOnboarding) {
      if (!hasSeenOnboarding) {
        router.replace("/(onboarding)");
      } else {
        router.replace("/(auth)/welcome");
      }
    }
  }, [isAuthenticated, segments, hasSeenOnboarding]);

  return <>{children}</>;
}

/** Matches app surfaces so native stack `colors.background` is not React Navigation’s default gray/white. */
function navigationThemeForApp(mode: "light" | "dark") {
  if (mode === "dark") {
    return {
      ...NavigationDarkTheme,
      colors: {
        ...NavigationDarkTheme.colors,
        background: AppDarkTheme.background,
        card: AppDarkTheme.background,
      },
    };
  }
  return {
    ...NavigationDefaultTheme,
    colors: {
      ...NavigationDefaultTheme.colors,
      background: LightTheme.gradientStart,
      card: LightTheme.background,
    },
  };
}

function ThemedRoot({
  children,
  onLayout,
}: {
  children: React.ReactNode;
  onLayout?: () => void;
}) {
  const themePreference = useSelector((state: RootState) => state.settings.theme);
  const systemColorScheme = useColorScheme();
  const mode =
    themePreference === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : themePreference;
  const surfaceBg =
    mode === "dark" ? AppDarkTheme.background : LightTheme.gradientStart;

  useEffect(() => {
    void setBackgroundColorAsync(surfaceBg);
  }, [surfaceBg]);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: surfaceBg }}
      onLayout={onLayout}
    >
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const themePreference = useSelector((state: RootState) => state.settings.theme);
  const systemColorScheme = useColorScheme();
  const theme =
    themePreference === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : themePreference;
  const navigationTheme = useMemo(
    () => navigationThemeForApp(theme),
    [theme],
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <AuthListener>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="subscription"
            options={{
              animation: "slide_from_bottom",
              contentStyle: { backgroundColor: Colors.darkNavy },
            }}
          />
        </Stack>
      </AuthListener>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "SpaceGrotesk-Regular": SpaceGroteskRegular,
    "SpaceGrotesk-Medium": SpaceGroteskMedium,
    "SpaceGrotesk-SemiBold": SpaceGroteskSemiBold,
    "SpaceGrotesk-Bold": SpaceGroteskBold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    let mounted = true;

    const applyOtaUpdateIfAvailable = async () => {
      if (__DEV__ || !Updates.isEnabled) return;

      try {
        const update = await Updates.checkForUpdateAsync();
        if (!update.isAvailable) return;

        await Updates.fetchUpdateAsync();
        if (mounted) {
          await Updates.reloadAsync();
        }
      } catch {
        // Keep app usable if update check fails.
      }
    };

    applyOtaUpdateIfAvailable();

    return () => {
      mounted = false;
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <Provider store={store}>
      <ThemedRoot onLayout={onLayoutRootView}>
        <PersistGate
          loading={
            <View style={styles.loading}>
              <ActivityIndicator color={Colors.mediumBlue} size="large" />
            </View>
          }
          persistor={persistor}
        >
          <AppContent />
        </PersistGate>
      </ThemedRoot>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.darkNavy,
  },
});
