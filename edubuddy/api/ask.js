import { buildPrompt, isValidTopic } from "../lib/prompts.js";

export const config = { maxDuration: 60 };

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const TIMEOUT_MS = 18000;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CACHE_MAX = 100;

// Simple in-memory cache: the same question is answered instantly
// and does not use up the free Gemini quota.
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.time > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.text;
}

function cacheSet(key, text) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { text, time: Date.now() });
}

async function askModel(model, prompt, isQuiz, apiKey) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: isQuiz ? { responseMimeType: "application/json" } : {}
        })
      }
    );
    const data = await r.json();
    console.log("Model:", model, "Status:", r.status);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text
      ? { text }
      : { error: `${model} [${r.status}]: ${data?.error?.message || "empty answer"}` };
  } catch (e) {
    return { error: `${model}: ${e.name === "AbortError" ? "timeout" : e.message}` };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { topic, level, mode, lang } = req.body || {};
  if (!isValidTopic(topic)) {
    return res.status(400).json({ error: "Please enter a topic (max 300 characters)." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is not configured: GEMINI_API_KEY is missing." });
  }

  const isQuiz = mode === "quiz";
  const key = [lang, level, mode, topic.trim().toLowerCase()].join("|");
  if (!isQuiz) {
    const cached = cacheGet(key);
    if (cached) return res.status(200).json({ text: cached, cached: true });
  }

  const prompt = buildPrompt({ topic, level, mode, lang });
  const errors = [];

  for (const model of MODELS) {
    const result = await askModel(model, prompt, isQuiz, apiKey);
    if (result.text) {
      if (!isQuiz) cacheSet(key, result.text);
      return res.status(200).json({ text: result.text });
    }
    errors.push(result.error);
  }

  console.error("All models failed:", errors.join(" | "));
  res.status(500).json({
    error: "The AI is busy right now. Please try again in a few seconds.",
    details: errors.join(" | ").slice(0, 300)
  });
}