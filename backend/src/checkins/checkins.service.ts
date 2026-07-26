import { Injectable } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";
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
- ask at most 2-4 structured follow-up questions (duration, severity,
  what makes it better/worse, associated symptoms, prior episodes,
  what's been tried) before concluding
- always end symptom discussions by recommending the user see a doctor,
  with an urgency level of "normal", "monitor", or "urgent"
- never suggest medication changes or name a likely diagnosis
- keep tone warm, calm, and non-clinical

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

@Injectable()
export class CheckinsService {
  private anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async handleMessage(message: string, history: HistoryItem[]) {
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

    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        ...history.map((h) => ({
          role: (h.from === "user" ? "user" : "assistant") as "user" | "assistant",
          content: h.text,
        })),
        { role: "user", content: message + regionalPatternNote },
      ],
    });

    const text = response.content.find((c) => c.type === "text")?.text || "{}";
    let parsed: { reply: string; urgency: "normal" | "monitor" | "urgent" };
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { reply: "Sorry, could you say that again?", urgency: "normal" };
    }

    return { ...parsed, crisisDetected: false };
  }
}
