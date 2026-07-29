import { Injectable } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HistoryItem } from "./dto/send-message.dto";

// Basic keyword net as a fast first pass ahead of the model.
// This is NOT a substitute for a properly reviewed crisis-detection
// system — see Action Items: "Crisis protocol response — needs
// crisis-response expert review" before this goes anywhere near
// real users.
const CRISIS_KEYWORDS = [
  "kill myself", "end my life", "hurt myself", "suicide", "want to die",
];

const SYSTEM_PROMPT = `
You are Remi, a daily health companion. You are NOT a doctor and must
never diagnose a condition or name a likely condition. You:
- explain medical terms and symptoms in plain language
- ask 1-3 focused follow-up questions (duration, severity,
  what makes it better/worse, associated symptoms, prior episodes,
  what's been tried) before concluding
- respond like a thoughtful chat partner, not a form or script: vary
  wording, acknowledge the user's exact concern briefly, and ask the
  next most useful question instead of listing every possible question
- prefer a short, conversational paragraph and then a natural question.
  Do not format the reply like a checklist unless the user asks for one
- do not reuse the same opening sentence across turns. Avoid canned
  phrases such as "I can't diagnose this" at the start of every reply;
  include the safety framing naturally only when it adds value
- if you already asked about duration, severity, or location earlier
  in the conversation, do not ask the same thing again unless the user
  gave a new or changed symptom. Ask one fresh, relevant next question
- gather enough context before giving a recommendation; if the user's
  description is unclear, incomplete, or could mean many things, ask
  warm follow-up questions instead of jumping straight to advice
- remember and refer to relevant details from the provided conversation
  history so the chat feels continuous, while still asking for new or
  changed information as the conversation goes on
- when useful, suggest the user can use a voice note, upload a picture,
  or take a picture to explain what they mean more clearly; do not
  pressure them to share images
- end symptom discussions by recommending the user see a doctor when
  appropriate, with an urgency level of "normal", "monitor", or
  "urgent"; phrase this naturally and not as a repeated badge-like
  line
- never suggest medication changes or name a likely diagnosis
- keep tone warm, calm, human, plain-language, and matter-of-fact

SEXUAL HEALTH TOPIC: when the topic is sexual_health, keep the same
non-diagnostic check-in pattern and stay strictly clinical, general,
matter-of-fact, and non-judgmental. You may discuss STI symptoms and
testing, genital or pelvic symptoms, periods, pregnancy concerns,
contraception, and reproductive health education. Ask concise
follow-up questions about symptoms, timing, pain, bleeding, discharge,
fever, possible pregnancy, and recent testing when relevant. Recommend
medical care or STI testing instead of diagnosing. Treat severe pelvic
or testicular pain, heavy bleeding, pregnancy with pain or bleeding,
fever with pelvic pain, or sexual assault/non-consensual exposure as
urgent. Do not include LGBTQ-specific health guidance or
gender-affirming care content in this build. If asked for excluded
content, redirect to general sexual/reproductive health information
and recommend speaking with a qualified clinician.

REGIONAL PRIORITY PATTERN: if the user describes fever combined with
chills and/or headache, treat this as a common regional pattern
(malaria/typhoid are common in this region) and respond faster than
you would for an equivalent generic symptom — skip extended
questioning if the pattern is already clear, set urgency to at least
"monitor" (or "urgent" if the fever is high/persistent or accompanied
by other concerning signs), and explicitly recommend getting tested
promptly rather than waiting it out. Stay non-diagnostic: describe the
pattern and the value of testing, never say "you have malaria" or
name any specific condition as confirmed.

Respond ONLY with strict JSON in this shape, no other text:
{"reply": string, "urgency": "normal" | "monitor" | "urgent"}
`;

const GEMINI_MODEL = "gemini-2.5-flash";

@Injectable()
export class CheckinsService {
  private gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  async handleMessage(
    message: string,
    history: HistoryItem[],
    topic: "general" | "sexual_health" = "general",
    memoryContext?: {
      recentActivities?: { title: string; detail: string; type: string; createdAt: string }[];
      schedules?: { title: string; detail: string; condition?: string }[];
    },
  ) {
    const lower = message.toLowerCase();
    if (CRISIS_KEYWORDS.some((k) => lower.includes(k))) {
      return { reply: "", urgency: "urgent", crisisDetected: true };
    }

    // Deterministic nudge (not a diagnosis) — reinforces the system
    // prompt's regional-pattern instruction rather than relying on
    // the model alone to notice fever+chills/headache every time.
    const hasFever = /\bfever\b/.test(lower);
    const hasChillsOrHeadache = /\b(chills|headache)\b/.test(lower);
    const regionalPatternNote = hasFever && hasChillsOrHeadache
      ? "\n\n[Note: fever combined with chills/headache described — apply the regional priority pattern guidance.]"
      : "";
    const topicNote = topic === "sexual_health"
      ? "\n\n[Topic: sexual_health — apply the sexual health topic guidance. Keep it clinical, general, non-diagnostic, and non-judgmental.]"
      : "";
    const memoryNote = buildMemoryNote(memoryContext);
    const styleNote = `\n\n[Conversation style: this is turn ${history.length + 1}. Keep it natural and specific to what the user just said. Do not sound like a template. If earlier messages already asked a question, move the conversation forward with a different helpful question or a short reflection.]`;

    let parsed: { reply: string; urgency: "normal" | "monitor" | "urgent" };
    try {
      if (!process.env.GEMINI_API_KEY) {
        parsed = fallbackCheckinReply(message, Boolean(regionalPatternNote), topic, history.length, memoryContext);
      } else {
        const model = this.gemini.getGenerativeModel({
          model: GEMINI_MODEL,
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: { maxOutputTokens: 650, responseMimeType: "application/json" },
        });
        const response = await model.generateContent({
          contents: [
            ...history.map((h) => ({
              role: h.from === "user" ? "user" : "model",
              parts: [{ text: h.text }],
            })),
            { role: "user", parts: [{ text: message + regionalPatternNote + topicNote + memoryNote + styleNote }] },
          ],
        });
        const text = response.response.text() || "{}";
        parsed = JSON.parse(text);
      }
    } catch (error) {
      console.warn("Check-in model fallback used:", safeErrorMessage(error));
      parsed = fallbackCheckinReply(message, Boolean(regionalPatternNote), topic, history.length, memoryContext);
    }

    return { ...parsed, crisisDetected: false };
  }
}

function fallbackCheckinReply(
  message: string,
  hasRegionalPattern: boolean,
  topic: "general" | "sexual_health",
  historyLength = 0,
  memoryContext?: {
    recentActivities?: { title: string; detail: string; type: string; createdAt: string }[];
    schedules?: { title: string; detail: string; condition?: string }[];
  },
): { reply: string; urgency: "normal" | "monitor" | "urgent" } {
  const lower = message.toLowerCase();
  const seed = message.length + historyLength;
  const shortDescription = lower.trim().split(/\s+/).length <= 5;
  const urgentPattern = /\b(chest pain|trouble breathing|shortness of breath|fainting|confusion|severe pain|heavy bleeding|seizure)\b/.test(lower);
  if (/\b(weekly brief|weekly summary|health brief|summarize my health|what did i track)\b/.test(lower)) {
    return { urgency: "normal", reply: fallbackWeeklyBrief(memoryContext) };
  }
  if (urgentPattern) {
    return {
      urgency: "urgent",
      reply: pick([
        "That sounds important to take seriously. I can't diagnose it here, but symptoms like this can need prompt medical care, especially if they are severe, new, or getting worse. If you can, tell me when it started and what else is happening, but please seek urgent help now if you feel unsafe or the symptoms are intense.",
        "I want to be careful with this one. I cannot diagnose it, but if this is severe, new, or getting worse, urgent care is the safer move. While you are getting help or deciding next steps, what changed first and what are you feeling right now?",
        "This is the kind of symptom I would not want you to sit with alone if it feels intense. Please seek urgent help now if you feel unsafe, and tell me what started it if you are able.",
      ], seed),
    };
  }

  if (hasRegionalPattern) {
    return {
      urgency: "monitor",
      reply: pick([
        "Fever with chills or headache is worth paying attention to where you are. I can't diagnose it, but testing promptly is usually wiser than waiting it out. What temperature have you measured, and when did the fever start? If typing is tiring, a short voice note is fine.",
        "Given the fever plus chills or headache, I would treat this as something to monitor closely and get tested for promptly, rather than waiting several days. How high has the fever been, and are you able to drink fluids normally?",
        "That combination can be rough, and it is worth checking early. I cannot tell what it is from chat, but a test would be useful if it continues. When did it begin, and is the headache mild, strong, or coming in waves?",
      ], seed),
    };
  }

  if (topic === "sexual_health") {
    return {
      urgency: "normal",
      reply: pick([
        "I hear you. I can't diagnose this, but we can sort the details so you know what to tell a clinician. When did it start, and are you noticing pain, fever, bleeding, discharge, possible pregnancy, or a recent exposure concern? If it feels awkward to type, you can use a voice note.",
        "Thanks for trusting me with that. Let’s keep this practical and private: when did it start, and is there pain, unusual bleeding, discharge, fever, or a possible pregnancy concern?",
        "Okay, we can work through it calmly. What are you noticing most right now, and has anything changed since it started?",
      ], seed),
    };
  }

  return {
    urgency: "normal",
    reply: fallbackConversationReply(shortDescription, historyLength, message),
  };
}

function fallbackConversationReply(shortDescription: boolean, historyLength: number, message: string) {
  const seed = message.length + historyLength;
  if (historyLength > 4) {
    return pick([
      "Okay, let’s keep following the thread from what you’ve already told me. What feels different right now compared with earlier: the intensity, the location, or how often it’s happening?",
      "I’m still with you. Compared with earlier, has the feeling moved, become stronger, or started happening more often?",
      "Let’s update the picture from where we left off. What is the biggest change you’ve noticed since your last message?",
    ], seed);
  }
  if (historyLength > 1) {
    return pick([
      "Got it. Rather than guessing, I want to narrow this down with you. Since you’ve already started describing it, what is the main change you’ve noticed since it began?",
      "That helps. To make the next step useful, tell me what feels most noticeable now and whether anything makes it ease up or flare.",
      "I understand. What has changed since it started: the strength, the timing, or any other symptoms showing up with it?",
    ], seed);
  }
  if (shortDescription) {
    return pick([
      "Tell me a little more so I can follow you properly. Where do you feel it most, and what is it like right now: sharp, dull, burning, pressure, or something else?",
      "I need a little more context to be useful. Where is it happening, and how strong does it feel on a 1 to 10 scale?",
      "Okay, give me the fuller picture. When did it start, and what does it feel like in your own words?",
    ], seed);
  }
  return pick([
    "Thanks, that gives me a better starting point. What seems to make it better or worse, and has anything new appeared since it started?",
    "I’m following. What have you tried so far, and did anything help even a little?",
    "That sounds uncomfortable. Has it stayed the same since it began, or is it changing as the day goes on?",
  ], seed);
}

function pick<T>(items: T[], seed: number) {
  return items[Math.abs(seed) % items.length];
}

function buildMemoryNote(memoryContext?: {
  recentActivities?: { title: string; detail: string; type: string; createdAt: string }[];
  schedules?: { title: string; detail: string; condition?: string }[];
}) {
  const activities = (memoryContext?.recentActivities || []).slice(0, 8);
  const schedules = (memoryContext?.schedules || []).slice(0, 8);
  if (!activities.length && !schedules.length) return "";

  return `\n\n[User health memory context: Use this only as user-provided app history. Do not diagnose from it. If the user asks for a weekly brief, summarize these items descriptively and suggest what to keep tracking.
Recent activities:
${activities.map((item) => `- ${item.createdAt || "recent"} | ${item.type}: ${clip(item.title)} - ${clip(item.detail)}`).join("\n") || "- none"}
Upcoming/saved reminders and schedules:
${schedules.map((item) => `- ${clip(item.title)} - ${clip(item.detail)}${item.condition ? ` (${clip(item.condition)})` : ""}`).join("\n") || "- none"}]`;
}

function fallbackWeeklyBrief(memoryContext?: {
  recentActivities?: { title: string; detail: string; type: string; createdAt: string }[];
  schedules?: { title: string; detail: string; condition?: string }[];
}) {
  const activities = (memoryContext?.recentActivities || []).slice(0, 5);
  const schedules = (memoryContext?.schedules || []).slice(0, 5);
  const activityText = activities.length
    ? activities.map((item) => `${item.title}: ${item.detail}`).join("; ")
    : "no recent activities are saved yet";
  const scheduleText = schedules.length
    ? schedules.map((item) => `${item.title}: ${item.detail}`).join("; ")
    : "no reminders or schedules are saved yet";
  return `Here is your weekly Remi health brief from what you have saved: ${activityText}. Upcoming reminders or schedules: ${scheduleText}. This is a descriptive summary only, not a diagnosis. This week, keep logging symptoms, medications, vitals, labs, and any changes you want your clinician to see.`;
}

function clip(value: string, max = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 180);
  return String(error).slice(0, 180);
}
