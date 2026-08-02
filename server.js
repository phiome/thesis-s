/**
 * AI Dependency Study — Chatbot backend proxy
 * -------------------------------------------------
 * Hides the API key and applies per-condition constraints.
 * Provider-agnostic: set PROVIDER=gemini (free tier) or PROVIDER=anthropic.
 *
 * Endpoints:
 *   GET  /health         -> { ok: true }
 *   POST /chat           -> { reply: "..." }
 *     body: { condition, language, messages:[{role,text}], essayDraft }
 *
 * Run locally:   npm install && npm start
 * Env vars:      see .env.example
 */

try { require("dotenv").config(); } catch (_) { /* dotenv optional; env vars may be set by the host */ }

const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors()); // for production, restrict to your study site's origin

// Serve the study app itself (public/index.html) so ONE deploy hosts both app + API
app.use(express.static(path.join(__dirname, "public")));

const PROVIDER = (process.env.PROVIDER || "groq").toLowerCase();
const PORT = process.env.PORT || 3000;

// ---- length cap (words) per condition ----
const WORD_CAP = 130; // supportive replies stay focused; enforced via prompt + max tokens

// ---- system prompts ----
function systemPrompt(condition, language) {
  const langName = language === "nl" ? "Dutch (Nederlands)" : "English";
  if (condition === "supportive") {
    return (
`You are a helpful WRITING ASSISTANT supporting a study participant who is writing a short essay (100–200 words).
Be genuinely useful:
- DO answer their questions, including factual ones (e.g. give facts, figures, definitions, examples, background).
- DO suggest ideas, angles, structure and an outline, and give feedback on text they have written.
- The ONLY thing you must NOT do is write the essay for them: do not produce ready-to-paste full sentences or paragraphs OF THE ESSAY ITSELF. Give the raw information and ideas; let them do the actual writing.
- If they say "write it / write the paragraph / write the essay", briefly decline and instead offer the facts, an outline, or bullet-point ideas they can write up themselves.
- Keep replies focused and under ${WORD_CAP} words. Reply in ${langName}.`
    );
  }
  // substitutive (unrestricted) — still a helpful assistant, no coach limits
  return (
`You are a helpful AI assistant. The user is writing a short essay (100–200 words).
Help them however they ask — including drafting text if they request it.
Reply in ${langName}.`
  );
}

// ---- provider calls ----
async function callGemini(system, history, essayDraft) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const contents = [];
  if (essayDraft && essayDraft.trim()) {
    contents.push({ role: "user", parts: [{ text: `[Participant's current essay draft]\n${essayDraft}` }] });
    contents.push({ role: "model", parts: [{ text: "Understood. I'll keep that draft in mind." }] });
  }
  for (const m of history) {
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] });
  }

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { maxOutputTokens: 220, temperature: 0.7 }
  };
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Gemini error ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "(no reply)";
}

async function callGroq(system, history, essayDraft) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const messages = [{ role: "system", content: system }];
  if (essayDraft && essayDraft.trim()) {
    messages.push({ role: "user", content: `[Participant's current essay draft]\n${essayDraft}` });
    messages.push({ role: "assistant", content: "Understood. I'll keep that draft in mind." });
  }
  for (const m of history) {
    messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.text });
  }
  const body = { model, messages, max_tokens: 300, temperature: 0.7 };
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Groq error ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data?.choices?.[0]?.message?.content?.trim() || "(no reply)";
}

async function callAnthropic(system, history, essayDraft) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  const messages = [];
  if (essayDraft && essayDraft.trim()) {
    messages.push({ role: "user", content: `[Participant's current essay draft]\n${essayDraft}` });
    messages.push({ role: "assistant", content: "Understood. I'll keep that draft in mind." });
  }
  for (const m of history) {
    messages.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.text });
  }
  const body = { model, system, messages, max_tokens: 300, temperature: 0.7 };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Anthropic error ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data?.content?.[0]?.text?.trim() || "(no reply)";
}

// ---- routes ----
app.get("/health", (req, res) => res.json({ ok: true, provider: PROVIDER }));

app.post("/chat", async (req, res) => {
  try {
    const { condition = "substitutive", language = "en", messages = [], essayDraft = "" } = req.body || {};
    if (condition === "control") {
      return res.status(403).json({ error: "AI is not available in the control condition." });
    }
    const system = systemPrompt(condition, language);
    const history = Array.isArray(messages) ? messages.slice(-20) : [];

    let reply;
    if (PROVIDER === "anthropic") reply = await callAnthropic(system, history, essayDraft);
    else if (PROVIDER === "gemini") reply = await callGemini(system, history, essayDraft);
    else reply = await callGroq(system, history, essayDraft);

    // safety: hard word cap for supportive condition
    if (condition === "supportive") {
      const words = reply.split(/\s+/);
      if (words.length > WORD_CAP) reply = words.slice(0, WORD_CAP).join(" ") + " …";
    }
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "chat_failed", detail: String(err.message || err) });
  }
});

app.listen(PORT, () => console.log(`Chatbot backend (${PROVIDER}) listening on :${PORT}`));
