"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIInsight = void 0;
const https_1 = require("firebase-functions/v2/https");
const MODEL = "stepfun/step-3.5-flash:free";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
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
    let response;
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
                model: MODEL,
                messages: [{ role: "user", content: buildPrompt(data) }],
                max_tokens: 1500,
                temperature: 0.7,
            }),
        });
    }
    catch (err) {
        console.error("OpenRouter fetch failed:", err);
        throw new https_1.HttpsError("unavailable", "Could not reach AI service.");
    }
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error(`OpenRouter ${response.status}:`, body);
        throw new https_1.HttpsError("internal", `AI service error: ${response.status}`);
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
//# sourceMappingURL=index.js.map