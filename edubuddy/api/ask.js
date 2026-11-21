export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const { topic, level, mode } = req.body || {};
  if (!topic || topic.length > 300) return res.status(400).json({ error: "Topic daalo (max 300 chars)" });

  const lvl = { kid: "a 10-year-old child", school: "a class 9-10 student", college: "a college student" }[level] || "a school student";
  const prompts = {
    explain: `Explain "${topic}" to ${lvl}. Use simple words. Structure with these bold headings: **Simple Idea**, **Step by Step**, **Real-life Example**, **Remember This** (3 bullet points). Keep it under 250 words.`,
    analogy: `Explain "${topic}" to ${lvl} using 2 fun, creative analogies from everyday Indian life (cricket, chai, trains, festivals, etc). Under 150 words.`,
    plan: `Create a 5-day study plan to master "${topic}" for ${lvl}. For each day: **Day N:** goal, what to study, 1 small practice task. Under 250 words.`,
    quiz: `Create 5 multiple-choice questions on "${topic}" for ${lvl}. Respond ONLY with JSON, no markdown: [{"q":"...","options":["A","B","C","D"],"answer":0,"why":"short explanation"}] where answer is the index of the correct option.`
  };
  const prompt = prompts[mode] || prompts.explain;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: mode === "quiz" ? { responseMimeType: "application/json" } : {}
        })
      }
    );
    const data = await r.json();
    console.log("Gemini status:", r.status, JSON.stringify(data).slice(0, 500));
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: data?.error?.message || "AI ne jawab nahi diya" });
    res.status(200).json({ text });
  } catch (e) {
    const msg = e.name === "AbortError" ? "AI ne bohot der laga di, dobara try karo." : "Server error: " + e.message;
    res.status(500).json({ error: msg });
  } finally {
    clearTimeout(timer);
  }
}