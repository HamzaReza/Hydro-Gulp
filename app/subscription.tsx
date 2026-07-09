import { router } from "expo-router";
import React from "react";
import { Alert } from "react-native";
import type { CustomerInfo, PurchasesError } from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { useDispatch } from "react-redux";
import { extractSubscriptionStatus } from "../services/revenuecat";
import { AppDispatch } from "../store";
import { setSubscription } from "../store/slices/subscriptionSlice";

// Optimistic Redux-only update so the UI flips to premium instantly after a
// purchase/restore. Firestore is written exclusively by the RevenueCat
// webhook (~1-3s later) and confirmed via the users/{uid} listener in
// app/_layout.tsx.
function syncToRedux(dispatch: AppDispatch, customerInfo: CustomerInfo) {
  const status = extractSubscriptionStatus(customerInfo);
  dispatch(setSubscription(status));
}

export default function SubscriptionScreen() {
  const dispatch = useDispatch<AppDispatch>();

  const handleDismiss = () => router.back();

  // onPurchaseCompleted receives { customerInfo, storeTransaction }
  const handlePurchaseCompleted = ({
    customerInfo,
  }: {
    customerInfo: CustomerInfo;
  }) => {
    syncToRedux(dispatch, customerInfo);
    router.back();
  };

  const handleRestoreCompleted = ({
    customerInfo,
  }: {
    customerInfo: CustomerInfo;
  }) => {
    const status = extractSubscriptionStatus(customerInfo);
    if (!status.isPremium) {
      // Nothing to restore for this store account — tell the user and keep
      // the paywall open.
      Alert.alert(
        "No Purchases Found",
        "We couldn't find an active subscription to restore for this account.",
      );
      return;
    }
    dispatch(setSubscription(status));
    router.back();
  };

  // Store/network failure during purchase (RC does not fire this for a
  // user cancellation) — surface the store's reason and keep the paywall open.
  const handlePurchaseError = ({ error }: { error: PurchasesError }) => {
    Alert.alert(
      "Purchase Failed",
      error.message ||
        "Something went wrong while processing your purchase. Please try again.",
    );
  };

  // The restore call itself failed (network/store error) — distinct from a
  // successful restore that found no purchases, handled above.
  const handleRestoreError = ({ error }: { error: PurchasesError }) => {
    Alert.alert(
      "Restore Failed",
      error.message ||
        "Something went wrong while restoring your purchases. Please try again.",
    );
  };

  return (
    <RevenueCatUI.Paywall
      onDismiss={handleDismiss}
      onPurchaseCompleted={handlePurchaseCompleted}
      onRestoreCompleted={handleRestoreCompleted}
      onPurchaseError={handlePurchaseError}
      onRestoreError={handleRestoreError}
      // Backing out of the payment sheet returns to the paywall (e.g. to
      // pick a different plan) instead of closing it.
      onPurchaseCancelled={() => {}}
    />
  );
}
