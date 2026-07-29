import { Injectable, Optional } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { randomUUID } from "crypto";
import { DocumentClassifierService, DocumentClassification } from "../document-classifier/document-classifier.service";
import { EncryptionService } from "../common/encryption.service";
import { SupabaseService } from "../common/supabase.service";
import { ImagingService } from "../imaging/imaging.service";
import { LabsService } from "../labs/labs.service";
import { SamplePhotosService } from "../sample-photos/sample-photos.service";
import { SymptomMediaService } from "../symptom-media/symptom-media.service";
import { HistoryItem } from "./dto/send-message.dto";
import { UploadCheckinDto } from "./dto/upload-checkin.dto";

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
- ask at most 2-4 follow-up questions total (duration, severity, what
  makes it better/worse, associated symptoms, prior episodes, what's
  been tried) — but fold them into natural, reactive conversation
  rather than a checklist. React first ("that sounds rough," "three
  days is a while for that"), THEN ask the next thing, and combine
  related questions into one sentence where it reads naturally
  ("has it been getting worse, and did you take anything for it?")
  rather than asking one bare question per turn.
- always end symptom discussions by recommending the user see a
  doctor, with an urgency level of "normal", "monitor", or "urgent" —
  say this ONCE, warmly and clearly, not as a repeated warning label
  on every subsequent message in the same conversation
- never suggest medication changes or name a likely diagnosis
- keep tone warm, conversational, and personal — like a caring friend
  with good judgment, not a clinician reading a script. Avoid clinical
  phrasing like "I'm not able to determine that" in favor of natural
  redirection like "that's really one for your doctor — let's get you
  ready for that conversation."
- when conversation history or memory is available, use it to make
  the greeting and responses feel continuous rather than starting
  fresh each time — e.g. reference something mentioned recently
  ("how's that headache from yesterday?") instead of always opening
  with a generic "how are you feeling today?"

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
chills and/or headache, treat this as a common regional pattern and
respond faster than you would for an equivalent generic symptom —
skip extended questioning if the pattern is already clear, set
urgency to at least "monitor" (or "urgent" if severe/persistent or
accompanied by other concerning signs), and explicitly recommend
getting tested promptly. Stay non-diagnostic — describe the pattern
and the value of testing, never confirm a specific condition.

Respond ONLY with strict JSON in this shape, no other text:
{"reply": string, "urgency": "normal" | "monitor" | "urgent"}
`;

const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.6-flash"];

@Injectable()
export class CheckinsService {
  private gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  constructor(
    @Optional()
    private readonly classifier?: DocumentClassifierService,
    @Optional()
    private readonly labs?: LabsService,
    @Optional()
    private readonly imaging?: ImagingService,
    @Optional()
    private readonly symptomMedia?: SymptomMediaService,
    @Optional()
    private readonly samplePhotos?: SamplePhotosService,
    @Optional()
    private readonly supabase?: SupabaseService,
    @Optional()
    private readonly encryption?: EncryptionService,
  ) {}

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
        const response = await this.generateWithAvailableModel([
          ...history.map((h) => ({
            role: h.from === "user" ? "user" : "model",
            parts: [{ text: h.text }],
          })),
          { role: "user", parts: [{ text: message + regionalPatternNote + topicNote + memoryNote + styleNote }] },
        ]);
        const text = response.response.text() || "{}";
        parsed = parseCheckinModelResponse(text);
      }
    } catch (error) {
      console.warn("Check-in model fallback used:", fallbackLogMessage(error));
      parsed = fallbackCheckinReply(message, Boolean(regionalPatternNote), topic, history.length, memoryContext);
    }

    return { ...parsed, crisisDetected: false };
  }

  private async generateWithAvailableModel(contents: { role: string; parts: { text: string }[] }[]) {
    const configured = process.env.GEMINI_CHECKINS_MODEL || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const candidates = [...new Set([configured, ...GEMINI_MODEL_FALLBACKS])];
    let lastError: unknown;

    for (const modelName of candidates) {
      try {
        const model = this.gemini.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: { maxOutputTokens: 650, responseMimeType: "application/json" },
        });
        return await model.generateContent({ contents });
      } catch (error) {
        lastError = error;
        if (!isMissingGeminiModelError(error)) throw error;
      }
    }

    throw lastError;
  }

  async handleUpload(userId: string, dto: UploadCheckinDto, analyticsEnabled = true) {
    const mediaType = dto.mediaType || "image/jpeg";
    const conversationRef = dto.conversationRef || new Date().toISOString();
    const classification = dto.confirmedCategory
      ? { category: dto.confirmedCategory as DocumentClassification["category"], confidence: "high" as const, reasoning: "User confirmed category." }
      : await this.classifier!.classify(dto.imageBase64, mediaType);

    if (classification.confidence === "low" || classification.category === "unclear") {
      return { status: "needs_confirmation", classification: publicClassification(classification), message: "I am not fully sure what this is. Please choose the upload type so I route it safely." };
    }

    const metadata = { source: "chat", conversationRef };
    if (classification.category === "lab_report") {
      const result = await this.labs!.interpretAndCompare(userId, dto.imageBase64, mediaType, analyticsEnabled, metadata);
      return { status: "processed", classification: publicClassification(classification), result, message: `This looks like a lab report. ${result.explanation}` };
    }
    if (classification.category === "scan_report") {
      const result = await this.imaging!.upload(userId, dto.imageBase64, "report_text", dto.scanType || "Imaging report", metadata);
      return { status: "processed", classification: publicClassification(classification), result, message: `This looks like an imaging report. ${result.explanation}` };
    }
    if (classification.category === "scan_image") {
      const result = await this.imaging!.upload(userId, dto.imageBase64, "scan_image", dto.scanType || "Scan image", metadata);
      return { status: "processed", classification: publicClassification(classification), result, message: "Saved to your scan history. Remi does not interpret raw scan images; your doctor can review the image directly." };
    }
    if (classification.category === "symptom_photo") {
      if (!dto.bodyLocation) return { status: "needs_body_location", classification: publicClassification(classification), message: "This looks like a symptom photo. Please choose where on the body it is from so I can save it safely." };
      const result = await this.symptomMedia!.storePhoto(userId, dto.imageBase64, dto.bodyLocation, metadata);
      return { status: "processed", classification: publicClassification(classification), result, message: `Saved the symptom photo with location: ${dto.bodyLocation}.` };
    }
    if (classification.category === "sample_photo") {
      if (!dto.sampleType) return { status: "needs_sample_type", classification: publicClassification(classification), message: "This looks like a sample photo. Please confirm whether it is urine or stool before I process it." };
      const result = await this.samplePhotos!.analyze(userId, dto.imageBase64, dto.sampleType, metadata);
      return { status: "processed", classification: publicClassification(classification), result, message: result.urgentMessage ? `${result.description} ${result.urgentMessage}` : result.description };
    }
    if (classification.category === "prescription") {
      return { status: "route_to_prescription_confirmation", classification: publicClassification(classification), message: "This looks like a prescription. Let's go through the details together before anything is saved." };
    }
    if (classification.category === "general_medical_document") {
      const result = await this.storeGeneralMedicalDocument(userId, dto.imageBase64, mediaType, metadata);
      return { status: "processed", classification: publicClassification(classification), result, message: `This looks like a medical document. ${result.explanation}` };
    }

    return { status: "needs_confirmation", classification: publicClassification(classification), message: "Please choose the upload type so I route it safely." };
  }

  private async storeGeneralMedicalDocument(userId: string, imageBase64: string, mediaType: string, metadata: { source: string; conversationRef: string }) {
    const explanation = await this.explainGeneralMedicalDocument(imageBase64, mediaType);
    const fileName = `${userId}/${randomUUID()}.jpg`;
    await this.supabase!.client.storage
      .from("medical-documents")
      .upload(fileName, Buffer.from(imageBase64, "base64"), { contentType: mediaType });
    const { data } = await this.supabase!.client
      .from("medical_documents")
      .insert({
        user_id: userId,
        explanation: this.encryption!.encrypt(explanation),
        photo_path: fileName,
        source: metadata.source,
        conversation_ref: metadata.conversationRef,
      })
      .select()
      .single();
    return { id: data?.id, explanation };
  }

  private async explainGeneralMedicalDocument(imageBase64: string, mediaType: string) {
    if (!process.env.GEMINI_API_KEY) return "Saved this document for your records. Please review it with your doctor.";
    const model = this.gemini.getGenerativeModel({
      model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
      systemInstruction: "Explain general medical documents in plain language. Stay descriptive and non-diagnostic. Do not infer, diagnose, or recommend treatment changes. End by recommending the user discuss it with their doctor. Return strict JSON: {\"explanation\": string}",
      generationConfig: { maxOutputTokens: 600, responseMimeType: "application/json" },
    });
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ inlineData: { mimeType: mediaType, data: imageBase64 } }, { text: "Explain this general medical document." }] }],
    });
    try {
      return JSON.parse(response.response.text() || "{}").explanation || "Saved this document for your records. Please review it with your doctor.";
    } catch {
      return "Saved this document for your records. Please review it with your doctor.";
    }
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
        "That sounds rough, and I would not want you sitting with it if it feels intense. Please get urgent medical help now, and if you can, tell me when it started and whether it has been getting worse.",
        "I want to be careful with you here. This is one for urgent care today, especially if it is new, severe, or getting worse; what changed first, and what are you feeling right now?",
        "That is worth taking seriously. Please seek urgent help now if you feel unsafe or the symptoms are strong, and tell me what started it if you are able.",
      ], seed),
    };
  }

  if (hasRegionalPattern) {
    return {
      urgency: "monitor",
      reply: pick([
        "Fever with chills or headache is worth checking promptly. Please get tested rather than waiting it out; how high has the fever been, and when did it start?",
        "That combination can be rough, and it is better to test early. I would treat this as monitor-level and arrange a prompt check; are you drinking fluids normally, and is the headache getting worse?",
        "Three things together like fever, chills, and headache deserve a faster look. Please get tested promptly, and tell me when it began and whether the fever is staying high.",
      ], seed),
    };
  }

  if (topic === "sexual_health") {
    return {
      urgency: "normal",
      reply: pick([
        "I hear you. Let's keep this practical and private so you know what to tell a clinician: when did it start, and are you noticing pain, fever, bleeding, discharge, possible pregnancy, or a recent exposure concern?",
        "Thanks for trusting me with that. When did it start, and is there pain, unusual bleeding, discharge, fever, or a possible pregnancy concern? A doctor or clinic can help you confirm what is going on.",
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
      "Okay, let's keep following the thread from what you already told me. What feels different now: the intensity, the location, or how often it is happening?",
      "I'm still with you. Compared with earlier, has it moved, become stronger, or started happening more often?",
      "Let's update the picture from where we left off. What is the biggest change since your last message?",
    ], seed);
  }
  if (historyLength > 1) {
    return pick([
      "Got it. Since you've already started describing it, what is the main change you noticed since it began? If it keeps going or worries you, it is worth checking with a doctor.",
      "That helps. To make the next step useful, tell me what feels most noticeable now and whether anything makes it ease up or flare.",
      "I understand. What has changed since it started: the strength, the timing, or any other symptoms showing up with it?",
    ], seed);
  }
  if (shortDescription) {
    return pick([
      "Tell me a little more so I can follow you properly. Where do you feel it most, and is it sharp, dull, burning, pressure, or something else?",
      "That sounds uncomfortable. Where is it happening, and how strong does it feel on a 1 to 10 scale?",
      "Okay, give me the fuller picture. When did it start, and has it been getting worse?",
    ], seed);
  }
  return pick([
    "Thanks, that gives me a better starting point. What seems to make it better or worse, and has anything new appeared since it started? If it persists, let's get you ready to talk it through with a doctor.",
    "I'm following. What have you tried so far, and did anything help even a little? A doctor can help confirm the safest next step if this keeps bothering you.",
    "That sounds uncomfortable. Has it stayed the same since it began, or is it changing as the day goes on? If it is not settling, it is worth getting checked.",
  ], seed);
}

function parseCheckinModelResponse(text: string): { reply: string; urgency: "normal" | "monitor" | "urgent" } {
  const candidates = [
    text,
    extractJsonObject(text),
    repairUnterminatedReplyJson(text),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return normalizeCheckinResponse(parsed);
    } catch {}
  }

  throw new Error(`Model returned invalid JSON: ${clip(text, 160)}`);
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  return text.slice(start, end + 1);
}

function repairUnterminatedReplyJson(text: string) {
  const source = extractJsonObject(text) || text;
  const replyMatch = source.match(/"reply"\s*:\s*"([\s\S]*)/);
  if (!replyMatch) return "";
  const reply = replyMatch[1]
    .replace(/\\?["}]?\s*,?\s*"urgency"[\s\S]*$/i, "")
    .replace(/[\u0000-\u001F]+/g, " ")
    .trim();
  const urgencyMatch = source.match(/"urgency"\s*:\s*"(normal|monitor|urgent)"/);
  return JSON.stringify({ reply, urgency: urgencyMatch?.[1] || "normal" });
}

function normalizeCheckinResponse(value: any): { reply: string; urgency: "normal" | "monitor" | "urgent" } {
  const reply = typeof value?.reply === "string" ? value.reply.trim() : "";
  const urgency = value?.urgency === "monitor" || value?.urgency === "urgent" ? value.urgency : "normal";
  if (!reply) throw new Error("Model JSON did not include a reply");
  return { reply, urgency };
}

function publicClassification(classification: DocumentClassification) {
  return { category: classification.category, confidence: classification.confidence };
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

function isMissingGeminiModelError(error: unknown) {
  const message = safeErrorMessage(error).toLowerCase();
  return message.includes("404") && (message.includes("not found") || message.includes("not supported")) && message.includes("model");
}

function fallbackLogMessage(error: unknown) {
  const message = safeErrorMessage(error);
  if (/fetch failed/i.test(message)) return "Gemini network request failed; using local fallback.";
  return message;
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 180);
  return String(error).slice(0, 180);
}
