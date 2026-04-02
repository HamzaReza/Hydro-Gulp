import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { Platform } from "react-native";
import { app } from "../firebase";

const functions = getFunctions(app, "us-central1");

// In dev builds, point at the local emulator instead of the deployed function.
// iOS simulator can reach localhost directly; Android emulator uses 10.0.2.2.
if (__DEV__) {
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  connectFunctionsEmulator(functions, host, 5001);
}

export interface HydrationInsightInput {
  todayTotal: number;
  goal: number;
  avg7: number;
  hydrationScore: number;
  unit: "ml" | "oz";
}

export interface HydrationInsightResult {
  quote: string;
  suggestion: string;
}

const getAIInsightFn = httpsCallable<HydrationInsightInput, HydrationInsightResult>(
  functions,
  "getAIInsight",
);

export async function fetchHydrationInsight(
  data: HydrationInsightInput,
): Promise<HydrationInsightResult> {
  const result = await getAIInsightFn(data);
  return result.data;
}
