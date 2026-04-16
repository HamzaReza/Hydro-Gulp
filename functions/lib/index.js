"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccountByEmail = exports.getAIInsight = void 0;
const https_1 = require("firebase-functions/v2/https");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
/** Primary first; if that model is rate-limited or unavailable, the next is used. Override with OPENROUTER_MODELS=comma,separated,ids */
const DEFAULT_MODELS = [
    "qwen/qwen3.6-plus:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
];
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
function getModelChain() {
    const raw = process.env.OPENROUTER_MODELS?.trim();
    if (raw) {
        const parsed = raw.split(",").map((m) => m.trim()).filter(Boolean);
        if (parsed.length > 0)
            return parsed;
    }
    return DEFAULT_MODELS;
}
/** HTTP statuses where trying another model may help (quota / rate / transient). */
function shouldTryNextModel(status) {
    return (status === 429 ||
        status === 402 ||
        status === 503 ||
        status === 502);
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
exports.getAIInsight = (0, https_1.onCall)({ region: "us-central1" }, async (request) => {
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
    const json = await response.json();
    if (json.error) {
        console.error("OpenRouter API error:", json.error);
        throw new https_1.HttpsError("internal", `OpenRouter error: ${JSON.stringify(json.error)}`);
    }
    const message = json?.choices?.[0]?.message;
    // stepfun/step-3.5-flash is a reasoning model: it writes its chain-of-thought
    // into `reasoning` and the final answer into `content`. Fall back to `reasoning`
    // in case the model embeds the JSON there when content is null/empty.
    const raw = (message?.content ?? "").trim() ||
        (message?.reasoning ?? "").trim();
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
            if (userData.email && userData.email.toLowerCase() === normalizedEmail) {
                userDocId = userDoc.id;
                break;
            }
        }
        if (!userDocId) {
            throw new https_1.HttpsError("not-found", "No account found with this email address.");
        }
        // Delete all subcollections
        const logsSnapshot = await db.collection("users").doc(userDocId).collection("logs").get();
        await Promise.all(logsSnapshot.docs.map((d) => d.ref.delete()));
        const remindersSnapshot = await db.collection("users").doc(userDocId).collection("reminders").get();
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
//# sourceMappingURL=index.js.map