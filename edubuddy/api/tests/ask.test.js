import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import handler from "../api/ask.js";
import { buildPrompt, isValidTopic } from "../lib/prompts.js";

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; }
  };
}

const okResponse = (text) => ({
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] })
});
const failResponse = (status = 503) => ({
  status,
  json: async () => ({ error: { message: "high demand" } })
});

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
});

test("isValidTopic accepts normal topics and rejects empty or too long", () => {
  assert.equal(isValidTopic("Black Holes"), true);
  assert.equal(isValidTopic("   "), false);
  assert.equal(isValidTopic(""), false);
  assert.equal(isValidTopic("a".repeat(301)), false);
  assert.equal(isValidTopic(null), false);
});

test("buildPrompt includes topic and chosen language", () => {
  const p = buildPrompt({ topic: "Gravity", level: "kid", mode: "explain", lang: "hi" });
  assert.match(p, /Gravity/);
  assert.match(p, /Hindi/);
  assert.match(p, /10-year-old/);
});

test("buildPrompt for quiz asks for JSON", () => {
  const p = buildPrompt({ topic: "Atoms", level: "school", mode: "quiz", lang: "en" });
  assert.match(p, /JSON/);
  assert.match(p, /5 multiple-choice/);
});

test("buildPrompt falls back to safe defaults for unknown values", () => {
  const p = buildPrompt({ topic: "Atoms", level: "???", mode: "???", lang: "???" });
  assert.match(p, /class 9-10/);
  assert.match(p, /simple, clear English/);
});

test("rejects non-POST requests with 405", async () => {
  const res = mockRes();
  await handler({ method: "GET" }, res);
  assert.equal(res.statusCode, 405);
});

test("rejects empty topic with 400", async () => {
  const res = mockRes();
  await handler({ method: "POST", body: { topic: "" } }, res);
  assert.equal(res.statusCode, 400);
});

test("returns 500 when API key is missing", async () => {
  delete process.env.GEMINI_API_KEY;
  const res = mockRes();
  await handler({ method: "POST", body: { topic: "Gravity" } }, res);
  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /GEMINI_API_KEY/);
});

test("returns the AI text on success", async () => {
  globalThis.fetch = async () => okResponse("Hello student");
  const res = mockRes();
  await handler({ method: "POST", body: { topic: "Success topic", mode: "explain" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.text, "Hello student");
});

test("falls back to the next model when the first one fails", async () => {
  let calls = 0;
  globalThis.fetch = async () => (++calls === 1 ? failResponse() : okResponse("Backup answer"));
  const res = mockRes();
  await handler({ method: "POST", body: { topic: "Fallback topic", mode: "explain" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.text, "Backup answer");
  assert.equal(calls, 2);
});

test("returns a friendly error when all models fail", async () => {
  globalThis.fetch = async () => failResponse(429);
  const res = mockRes();
  await handler({ method: "POST", body: { topic: "All fail topic", mode: "explain" } }, res);
  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /busy/);
});

test("serves repeated questions from cache without calling the AI again", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return okResponse("Cached answer"); };
  const body = { topic: "Cache topic", level: "school", mode: "explain", lang: "en" };

  const r1 = mockRes();
  await handler({ method: "POST", body }, r1);
  const r2 = mockRes();
  await handler({ method: "POST", body }, r2);

  assert.equal(calls, 1);
  assert.equal(r2.body.cached, true);
  assert.equal(r2.body.text, "Cached answer");
});