export const config = { maxDuration: 60 };

// Tried in this order. If one is busy, slow, or out of quota, we move to the next.
const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-flash-lite"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { topic, level, mode } = req.body || {};
  if (!topic || topic.length > 300) {
    return res.status(400).json({ error: "Please enter a topic (max 300 characters)." });
  }

  const lvl =
    { kid: "a 10-year-old child", school: "a class 9-10 student", college: "a college student" }[level] ||
    "a school student";

  const base =
    "You are EduBuddy, a kind and patient teacher whose mission is to give every student free, " +
    "quality learning, especially those who cannot afford tuition or coaching. " +
    "Always respond in simple, clear English. Avoid jargon, and explain any difficult word you use. " +
    "Never make the student feel bad for not knowing something.";

  const prompts = {
    explain: `${base}\nExplain "${topic}" to ${lvl}. Structure the answer with these bold headings: **Simple Idea**, **Step by Step**, **Real-life Example**, **Remember This** (3 bullet points). Keep it under 250 words.`,
    analogy: `${base}\nExplain "${topic}" to ${lvl} using 2 fun, creative analogies from everyday life in India (cricket, chai, trains, festivals, local markets, etc). Keep it under 150 words.`,
    plan: `${base}\nCreate a free, practical 5-day study plan to master "${topic}" for ${lvl}. Assume the student has only a phone or a basic computer and no paid courses. For each day write: **Day N:** goal, what to study, and 1 small practice task. Keep it under 250 words.`,
    quiz: `${base}\nCreate 5 multiple-choice questions on "${topic}" for ${lvl}. Respond ONLY with JSON, no markdown: [{"q":"...","options":["A","B","C","D"],"answer":0,"why":"short, encouraging explanation in simple English"}] where answer is the index of the correct option.`
  };
  const prompt = prompts[mode] || prompts.explain;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: mode === "quiz" ? { responseMimeType: "application/json" } : {}
  });

  let lastError = "The AI is very busy right now. Please try again in a few seconds.";

  for (const model of MODELS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 16000);
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, signal: ctrl.signal, body }
      );
      const data = await r.json();
      console.log(`Model ${model} status:`, r.status, JSON.stringify(data).slice(0, 300));

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return res.status(200).json({ text });

      lastError = data?.error?.message || lastError;
      // Invalid API key: other models will not help.
      if (r.status === 400 || r.status === 401 || r.status === 403) {
        return res.status(500).json({ error: lastError });
      }
      // 429 (quota), 503 (busy), 404 (model name), others: try the next model.
    } catch (e) {
      lastError =
        e.name === "AbortError"
          ? "The AI is taking too long. Please try again in a moment."
          : "Server error: " + e.message;
    } finally {
      clearTimeout(timer);
    }
  }

  return res.status(500).json({ error: "The AI is very busy right now. Please try again in a few seconds." });
}