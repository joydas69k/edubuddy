// Pure helper functions: no network, easy to test.

export const LEVELS = {
  kid: "a 10-year-old child",
  school: "a class 9-10 student",
  college: "a college student"
};

export const LANGUAGES = {
  en: "simple, clear English",
  hi: "simple Hindi written in Devanagari script",
  hinglish: "simple Hinglish (Hindi written in English letters)"
};

export const MODES = ["explain", "analogy", "plan", "quiz"];

export function isValidTopic(topic) {
  return typeof topic === "string" && topic.trim().length > 0 && topic.length <= 300;
}

export function buildPrompt({ topic, level, mode, lang }) {
  const lvl = LEVELS[level] || LEVELS.school;
  const langName = LANGUAGES[lang] || LANGUAGES.en;
  const safeTopic = String(topic).trim().replace(/"/g, "'");

  const base =
    "You are EduBuddy, a kind and patient teacher whose mission is to give every student free, " +
    "quality learning, especially those who cannot afford tuition or coaching. " +
    `Always respond in ${langName}. Avoid jargon, and explain any difficult word you use. ` +
    "Never make the student feel bad for not knowing something.";

  const prompts = {
    explain: `${base}\nExplain "${safeTopic}" to ${lvl}. Structure the answer with these bold headings (translated into the answer language): **Simple Idea**, **Step by Step**, **Real-life Example**, **Remember This** (3 bullet points). Keep it under 250 words.`,
    analogy: `${base}\nExplain "${safeTopic}" to ${lvl} using 2 fun, creative analogies from everyday life in India (cricket, chai, trains, festivals, local markets, etc). Keep it under 150 words.`,
    plan: `${base}\nCreate a free, practical 5-day study plan to master "${safeTopic}" for ${lvl}. Assume the student has only a phone or a basic computer and no paid courses. For each day write: **Day N:** goal, what to study, and 1 small practice task. Keep it under 250 words.`,
    quiz: `${base}\nCreate 5 multiple-choice questions on "${safeTopic}" for ${lvl}. Write the questions, options and explanations in the answer language. Respond ONLY with JSON, no markdown: [{"q":"...","options":["A","B","C","D"],"answer":0,"why":"short, encouraging explanation"}] where answer is the index of the correct option.`
  };

  return prompts[mode] || prompts.explain;
}