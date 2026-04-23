import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// ─── API Keys ──────────────────────────────────────────────────────────────
// Set these in your .env file:
//   EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxx
//   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxx
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

// ─── RevenueCat identifiers ─────────────────────────────────────────────────
// These must match exactly what you configure in the RevenueCat dashboard.
export const RC_ENTITLEMENT_ID = 'premium';
export const RC_OFFERING_ID = 'default';

// Product identifiers — must match App Store Connect & Google Play Console.
export const RC_PRODUCT_IDS = {
  monthly: 'hydrogulp_monthly_399',
  yearly: 'hydrogulp_yearly_3599',
} as const;

// ─── Configure ──────────────────────────────────────────────────────────────
/**
 * Call once on app start (before any user is known).
 * RevenueCat will operate in anonymous mode until `loginRevenueCat` is called.
 */
export function configureRevenueCat() {
  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  if (!apiKey) {
    console.warn('[RevenueCat] API key is missing — check your .env file.');
    return;
  }
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }
  Purchases.configure({ apiKey });
}

// ─── Identity ───────────────────────────────────────────────────────────────
/**
 * Link this RevenueCat session to the signed-in app user.
 * Firebase uid is the alias — unique per app account, never changes.
 */
export async function loginRevenueCat(uid: string): Promise<void> {
  await Purchases.logIn(uid);
}

/**
 * Called on sign-out. Reverts to an anonymous RevenueCat identity.
 */
export async function logoutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
  } catch {
    // logOut throws if the user is already anonymous — safe to swallow.
  }
}

// ─── Offerings ──────────────────────────────────────────────────────────────
/**
 * Fetch the current RC offering. Returns null when offline or misconfigured.
 */
export async function fetchOffering(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? offerings.all[RC_OFFERING_ID] ?? null;
  } catch (e) {
    console.warn('[RevenueCat] fetchOffering error:', e);
    return null;
  }
}

/**
 * Find the monthly and yearly packages inside the given offering.
 */
export function extractPackages(offering: PurchasesOffering): {
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
} {
  const monthly =
    offering.monthly ??
    offering.availablePackages.find(
      (p) => p.product.identifier === RC_PRODUCT_IDS.monthly
    ) ??
    null;

  const yearly =
    offering.annual ??
    offering.availablePackages.find(
      (p) => p.product.identifier === RC_PRODUCT_IDS.yearly
    ) ??
    null;

  return { monthly, yearly };
}

// ─── Purchase ────────────────────────────────────────────────────────────────
/**
 * Initiate a purchase for the given RC package.
 * Returns CustomerInfo on success; throws on failure / cancellation.
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

// ─── Restore ────────────────────────────────────────────────────────────────
/**
 * Restore previous purchases for the current store account.
 * RevenueCat merges them back onto the current alias automatically.
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

// ─── Entitlement helpers ─────────────────────────────────────────────────────
/**
 * Derive subscription status from a CustomerInfo object.
 */
export function extractSubscriptionStatus(customerInfo: CustomerInfo): {
  isPremium: boolean;
  plan: 'monthly' | 'yearly' | null;
  expiryDate: number | null;
} {
  // Try the configured entitlement ID first, then fall back to any active entitlement.
  // This prevents a silent failure if the RC dashboard uses a different identifier.
  const entitlement =
    customerInfo.entitlements.active[RC_ENTITLEMENT_ID] ??
    Object.values(customerInfo.entitlements.active)[0] ??
    null;

  if (__DEV__) {
    console.log('[RC] active entitlements:', Object.keys(customerInfo.entitlements.active));
    console.log('[RC] matched entitlement:', entitlement?.identifier ?? 'none');
  }

  if (!entitlement) {
    return { isPremium: false, plan: null, expiryDate: null };
  }

  const productId = entitlement.productIdentifier;
  const plan: 'monthly' | 'yearly' =
    productId === RC_PRODUCT_IDS.yearly ? 'yearly' : 'monthly';

  const expiryDate = entitlement.expirationDate
    ? new Date(entitlement.expirationDate).getTime()
    : null;

  return { isPremium: true, plan, expiryDate };
}

/**
 * Fetch live entitlement status directly from RevenueCat.
 * Use this on app foreground / after login to keep Redux in sync.
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

