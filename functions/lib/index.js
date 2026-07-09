"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revenuecatWebhook = exports.deleteAccountByEmail = exports.getAIInsight = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
/** Primary first; if that model is rate-limited or unavailable, the next is used. Override with OPENROUTER_MODELS=comma,separated,ids */
const DEFAULT_MODELS = [
    "openai/gpt-oss-120b:free",
    "openai/gpt-oss-20b:free",
    "google/gemma-4-31b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
];
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
function getModelChain() {
    const raw = process.env.OPENROUTER_MODELS?.trim();
    if (raw) {
        const parsed = raw
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean);
        if (parsed.length > 0)
            return parsed;
    }
    return DEFAULT_MODELS;
}
/** HTTP statuses where trying another model may help (quota / rate / transient). */
function shouldTryNextModel(status) {
    return [404, 429, 402, 503, 502].includes(status);
}
function buildPrompt(d) {
    const pct = d.goal > 0 ? Math.round((d.todayTotal / d.goal) * 100) : 0;
    return `You are a friendly hydration coach inside a water-tracking app called HydroGulp. Analyze the user's hydration data below and respond ONLY with a valid JSON object — no markdown, no extra text, no explanation.

User stats:
- Today's intake: ${d.todayTotal}${d.unit} out of ${d.goal}${d.unit} goal (${pct}% achieved)
- 7-day average: ${d.avg7}${d.unit}/day
- Hydration score: ${d.hydrationScore}/100

Respond with exactly this JSON structure:
{"quote":"<1-2 sentence motivational or congratulatory message tailored to their current progress>","suggestion":"<2-3 sentence specific actionable advice for improving or maintaining hydration today>"}`;
}
function extractJSON(raw) {
    // 1. Direct parse
    try {
        return JSON.parse(raw.trim());
    }
    catch { }
    // 2. Strip markdown code fences
    const fenceStripped = raw
        .replace(/^```(?:json)?\s*/im, "")
        .replace(/\s*```\s*$/m, "")
        .trim();
    try {
        return JSON.parse(fenceStripped);
    }
    catch { }
    // 3. Extract first {...} block — handles prose before/after JSON
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        }
        catch { }
    }
    return null;
}
exports.getAIInsight = (0, https_1.onCall)({ region: "us-central1", secrets: ["OPENROUTER_API_KEY"] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new https_1.HttpsError("internal", "OpenRouter API key not configured.");
    }
    const data = request.data;
    if (typeof data.todayTotal !== "number" ||
        typeof data.goal !== "number" ||
        typeof data.avg7 !== "number" ||
        typeof data.hydrationScore !== "number") {
        throw new https_1.HttpsError("invalid-argument", "Invalid input data.");
    }
    const models = getModelChain();
    const prompt = buildPrompt(data);
    let response;
    for (let i = 0; i < models.length; i++) {
        const model = models[i];
        try {
            response = await fetch(ENDPOINT, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://hydrogulp.app",
                    "X-OpenRouter-Title": "HydroGulp",
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 1500,
                    temperature: 0.7,
                }),
            });
        }
        catch (err) {
            console.error(`OpenRouter fetch failed (model ${model}):`, err);
            if (i === models.length - 1) {
                throw new https_1.HttpsError("unavailable", "Could not reach AI service.");
            }
            continue;
        }
        if (!response.ok) {
            const errText = await response.text().catch(() => "");
            console.error(`OpenRouter ${response.status} for model ${model}:`, errText);
            if (shouldTryNextModel(response.status) && i < models.length - 1) {
                continue;
            }
            throw new https_1.HttpsError("internal", `AI service error: ${response.status}`);
        }
        break;
    }
    if (!response?.ok) {
        throw new https_1.HttpsError("internal", "AI service error: no model succeeded.");
    }
    const json = (await response.json());
    if (json.error) {
        console.error("OpenRouter API error:", json.error);
        throw new https_1.HttpsError("internal", `OpenRouter error: ${JSON.stringify(json.error)}`);
    }
    const message = json?.choices?.[0]?.message;
    // stepfun/step-3.5-flash is a reasoning model: it writes its chain-of-thought
    // into `reasoning` and the final answer into `content`. Fall back to `reasoning`
    // in case the model embeds the JSON there when content is null/empty.
    const raw = (message?.content ?? "").trim() || (message?.reasoning ?? "").trim();
    console.log("content:", message?.content ? "present" : "null");
    console.log("reasoning length:", message?.reasoning?.length ?? 0);
    console.log("raw (first 200):", raw.slice(0, 200));
    const parsed = extractJSON(raw);
    if (!parsed?.quote || !parsed?.suggestion) {
        throw new https_1.HttpsError("internal", `Incomplete AI response. Raw: ${raw.slice(0, 300)}`);
    }
    return { quote: parsed.quote, suggestion: parsed.suggestion };
});
exports.deleteAccountByEmail = (0, https_1.onCall)({ region: "us-central1" }, async (request) => {
    const email = request.data?.email;
    if (!email || typeof email !== "string") {
        throw new https_1.HttpsError("invalid-argument", "Email is required.");
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid email format.");
    }
    try {
        const db = (0, firestore_1.getFirestore)();
        const auth = (0, auth_1.getAuth)();
        // Find user by email in Firestore
        const usersSnapshot = await db.collection("users").get();
        let userDocId = null;
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            if (userData.email &&
                userData.email.toLowerCase() === normalizedEmail) {
                userDocId = userDoc.id;
                break;
            }
        }
        if (!userDocId) {
            throw new https_1.HttpsError("not-found", "No account found with this email address.");
        }
        // Delete all subcollections
        const logsSnapshot = await db
            .collection("users")
            .doc(userDocId)
            .collection("logs")
            .get();
        await Promise.all(logsSnapshot.docs.map((d) => d.ref.delete()));
        const remindersSnapshot = await db
            .collection("users")
            .doc(userDocId)
            .collection("reminders")
            .get();
        await Promise.all(remindersSnapshot.docs.map((d) => d.ref.delete()));
        // Delete user document
        await db.collection("users").doc(userDocId).delete();
        // Attempt to delete Firebase Auth account
        try {
            await auth.deleteUser(userDocId);
        }
        catch (authError) {
            // Log but don't fail if auth account doesn't exist
            console.warn(`Could not delete auth account for ${userDocId}: ${authError.message}`);
        }
        return {
            success: true,
            message: `Account and all associated data for ${normalizedEmail} have been deleted.`,
        };
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        console.error("Delete account error:", error);
        throw new https_1.HttpsError("internal", "An error occurred while processing your deletion request.");
    }
});
const MONTHLY_PRODUCT_ID = "hydrogulp_monthly_399";
const YEARLY_PRODUCT_ID = "hydrogulp_yearly_3599";
function planFromProductId(productId) {
    if (!productId)
        return null;
    if (productId.includes(YEARLY_PRODUCT_ID))
        return "yearly";
    if (productId.includes(MONTHLY_PRODUCT_ID))
        return "monthly";
    // Fallback: infer from common naming patterns
    if (productId.includes("year") || productId.includes("annual"))
        return "yearly";
    if (productId.includes("month"))
        return "monthly";
    return null;
}
/** The RC alias is the Firebase UID directly. */
function uidFromAlias(alias) {
    return alias;
}
exports.revenuecatWebhook = (0, https_1.onRequest)({ region: "us-central1", secrets: ["REVENUECAT_WEBHOOK_SECRET"] }, async (req, res) => {
    // Only accept POST
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    // Verify authorization header
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    const authHeader = req.headers["authorization"] ?? "";
    if (secret && authHeader !== secret) {
        console.warn("[RC Webhook] Unauthorized request — invalid secret.");
        res.status(401).send("Unauthorized");
        return;
    }
    const payload = req.body;
    const event = payload?.event;
    if (!event?.type || !event?.app_user_id) {
        res.status(400).send("Bad Request");
        return;
    }
    const uid = uidFromAlias(event.app_user_id);
    const db = (0, firestore_1.getFirestore)();
    const userRef = db.collection("users").doc(uid);
    console.log(`[RC Webhook] event=${event.type} uid=${uid} product=${event.product_id ?? "n/a"}`);
    // RC does not guarantee delivery order and retries can duplicate events,
    // so every state change is guarded by latest-expiry-wins inside a
    // transaction: an event carrying an older expiration than what's stored
    // is stale and must not overwrite newer state. Writes use set+merge so a
    // not-yet-created user doc is created instead of throwing NOT_FOUND.
    const storedExpiryMs = (snap) => {
        const ts = snap.get("premiumExpiry");
        return ts?.toMillis?.() ?? 0;
    };
    try {
        switch (event.type) {
            case "INITIAL_PURCHASE":
            case "RENEWAL":
            case "PRODUCT_CHANGE": {
                const plan = planFromProductId(event.product_id);
                const expiryMs = event.expiration_at_ms ?? null;
                const applied = await db.runTransaction(async (tx) => {
                    const snap = await tx.get(userRef);
                    if (expiryMs && expiryMs < storedExpiryMs(snap))
                        return false;
                    tx.set(userRef, {
                        isPremium: true,
                        premiumPlan: plan,
                        premiumExpiry: expiryMs ? firestore_1.Timestamp.fromMillis(expiryMs) : null,
                        // Clear flags from a previous billing cycle.
                        premiumBillingIssue: false,
                        premiumCancelledAt: null,
                    }, { merge: true });
                    return true;
                });
                console.log(applied
                    ? `[RC Webhook] ✓ Premium activated — uid=${uid} plan=${plan}`
                    : `[RC Webhook] ⤳ Stale ${event.type} ignored — uid=${uid}`);
                break;
            }
            case "CANCELLATION":
                // Cancelled but not yet expired — keep premium until expiry date.
                // RC will send EXPIRATION when access actually ends.
                await userRef.set({ premiumCancelledAt: firestore_1.Timestamp.now() }, { merge: true });
                console.log(`[RC Webhook] ✓ Cancellation recorded — uid=${uid} (still active until expiry)`);
                break;
            case "EXPIRATION": {
                const expiryMs = event.expiration_at_ms ?? null;
                const applied = await db.runTransaction(async (tx) => {
                    const snap = await tx.get(userRef);
                    // A stale EXPIRATION for a previous period must not flip a
                    // renewed subscription back to free.
                    if (expiryMs && expiryMs < storedExpiryMs(snap))
                        return false;
                    tx.set(userRef, { isPremium: false, premiumPlan: null, premiumExpiry: null }, { merge: true });
                    return true;
                });
                console.log(applied
                    ? `[RC Webhook] ✓ Premium expired — uid=${uid}`
                    : `[RC Webhook] ⤳ Stale EXPIRATION ignored — uid=${uid}`);
                break;
            }
            case "BILLING_ISSUES_DETECTED":
                // Keep premium active — RC will retry billing.
                // Optionally surface this to the user via a flag.
                await userRef.set({ premiumBillingIssue: true }, { merge: true });
                console.log(`[RC Webhook] ✓ Billing issue recorded — uid=${uid}`);
                break;
            default:
                console.log(`[RC Webhook] Unhandled event type: ${event.type}`);
                break;
        }
        res.status(200).send("OK");
    }
    catch (error) {
        console.error("[RC Webhook] Firestore update failed:", error);
        // Genuine server errors return 500 so RC retries the delivery.
        res.status(500).send("Internal Server Error");
    }
});
//# sourceMappingURL=index.js.map