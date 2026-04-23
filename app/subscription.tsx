import { router } from "expo-router";
import { doc, Timestamp, updateDoc } from "firebase/firestore";
import React from "react";
import type { CustomerInfo } from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { useDispatch, useSelector } from "react-redux";
import { db } from "../firebase";
import { extractSubscriptionStatus } from "../services/revenuecat";
import { AppDispatch, RootState } from "../store";
import { setSubscription } from "../store/slices/subscriptionSlice";

function syncToStore(
  dispatch: AppDispatch,
  uid: string,
  customerInfo: CustomerInfo,
) {
  const status = extractSubscriptionStatus(customerInfo);

  dispatch(setSubscription(status));

  updateDoc(doc(db, "users", uid), {
    isPremium: status.isPremium,
    premiumPlan: status.plan,
    premiumExpiry: status.expiryDate
      ? Timestamp.fromMillis(status.expiryDate)
      : null,
  }).catch((e) => console.error("[syncToStore] Firestore update failed:", e));
}

export default function SubscriptionScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const handleDismiss = () => router.back();

  // onPurchaseCompleted receives { customerInfo, storeTransaction }
  const handlePurchaseCompleted = ({
    customerInfo,
  }: {
    customerInfo: CustomerInfo;
  }) => {
    if (uid) syncToStore(dispatch, uid, customerInfo);
    router.back();
  };

  const handleRestoreCompleted = ({
    customerInfo,
  }: {
    customerInfo: CustomerInfo;
  }) => {
    if (uid) syncToStore(dispatch, uid, customerInfo);
    router.back();
  };

  return (
    <RevenueCatUI.Paywall
      onDismiss={handleDismiss}
      onPurchaseCompleted={handlePurchaseCompleted}
      onRestoreCompleted={handleRestoreCompleted}
      onPurchaseError={() => {}}
      onPurchaseCancelled={handleDismiss}
    />
  );
}
