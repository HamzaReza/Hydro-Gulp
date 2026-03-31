import { useFonts } from "expo-font";
import { router, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import React, { useCallback, useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider, useDispatch, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import SpaceGroteskBold from "../assets/fonts/SpaceGrotesk-Bold.ttf";
import SpaceGroteskMedium from "../assets/fonts/SpaceGrotesk-Medium.ttf";
import SpaceGroteskRegular from "../assets/fonts/SpaceGrotesk-Regular.ttf";
import SpaceGroteskSemiBold from "../assets/fonts/SpaceGrotesk-SemiBold.ttf";
import { Colors } from "../constants/theme";
import { auth, db } from "../firebase";
import { AppDispatch, persistor, RootState, store } from "../store";
import { clearUser, setUser } from "../store/slices/authSlice";
import { setGoal, setUnit } from "../store/slices/hydrationSlice";
import { fetchProfileThunk } from "../store/slices/profileSlice";
import { setSubscription } from "../store/slices/subscriptionSlice";

SplashScreen.preventAutoHideAsync();

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

        // Hydrate profile and subscription from Firestore
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const data = snap.data();
            dispatch(fetchProfileThunk(user.uid));
            if (data.goal) dispatch(setGoal(data.goal));
            if (data.unit) dispatch(setUnit(data.unit));

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
          }
        } catch (e) {
          // Offline — use cached Redux state
        }
      } else {
        dispatch(clearUser());
      }
    });

    return unsubscribe;
  }, [dispatch]);

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (!isAuthenticated && !inAuthGroup && !inOnboarding) {
      if (!hasSeenOnboarding) {
        router.replace("/(onboarding)");
      } else {
        router.replace("/(auth)/welcome");
      }
    } else if (isAuthenticated && (inAuthGroup || inOnboarding)) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, segments, hasSeenOnboarding]);

  return <>{children}</>;
}

function AppContent() {
  const theme = useSelector((state: RootState) => state.settings.theme);

  return (
    <AuthListener>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="subscription"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </AuthListener>
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
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <Provider store={store}>
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
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
