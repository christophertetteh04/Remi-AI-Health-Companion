import { Injectable } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type DocumentCategory =
  | "lab_report"
  | "prescription"
  | "scan_report"
  | "scan_image"
  | "symptom_photo"
  | "sample_photo"
  | "general_medical_document"
  | "unclear";

export type DocumentClassification = {
  category: DocumentCategory;
  confidence: "high" | "low";
  reasoning: string;
};

const CLASSIFIER_PROMPT = `
You classify uploaded medical images for routing only.
Return ONLY strict JSON:
{
  "category": "lab_report" | "prescription" | "scan_report" |
              "scan_image" | "symptom_photo" | "sample_photo" |
              "general_medical_document" | "unclear",
  "confidence": "high" | "low",
  "reasoning": string
}

Rules:
- This call NEVER interprets medical content. It only identifies what TYPE
  of document/photo this is from its visual format, such as a printed lab
  results table, handwritten prescription pad, X-ray film, symptom photo,
  sample photo, discharge summary, or referral letter.
- If it is ambiguous whether something is a full scan image vs a written
  report about a scan, default to "scan_image" rather than guessing
  "scan_report". Never let ambiguity default toward the path that triggers
  AI interpretation.
- If confidence is low for any category, return confidence "low".
- reasoning must be one short sentence for logging/debugging only.
`;

const DEFAULT_CLASSIFIER_MODEL = "gemini-flash-latest";

@Injectable()
export class DocumentClassifierService {
  private gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  async classify(imageBase64: string, mediaType = "image/jpeg"): Promise<DocumentClassification> {
    if (!process.env.GEMINI_API_KEY) return { category: "unclear", confidence: "low", reasoning: "Gemini is not configured." };

    const model = this.gemini.getGenerativeModel({
      model: process.env.GEMINI_CLASSIFIER_MODEL || process.env.GEMINI_MODEL || DEFAULT_CLASSIFIER_MODEL,
      systemInstruction: CLASSIFIER_PROMPT,
      generationConfig: { maxOutputTokens: 220, responseMimeType: "application/json" },
    });
    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mediaType, data: imageBase64 } },
            { text: "Classify this upload for routing only." },
          ],
        },
      ],
    });

    return normalizeClassification(parseClassificationJson(response.response.text() || "{}"));
  }
}

function parseClassificationJson(text: string) {
  const jsonText = extractJsonObject(text) || text;
  try {
    return JSON.parse(jsonText);
  } catch {
    try {
      return JSON.parse(repairLooseJson(jsonText));
    } catch (error) {
      console.warn("Document classifier fallback used:", safeErrorMessage(error));
      return { category: "unclear", confidence: "low", reasoning: "Classifier returned malformed JSON." };
    }
  }
}

function normalizeClassification(value: any): DocumentClassification {
  const categories: DocumentCategory[] = ["lab_report", "prescription", "scan_report", "scan_image", "symptom_photo", "sample_photo", "general_medical_document", "unclear"];
  const category = categories.includes(value?.category) ? value.category : "unclear";
  const confidence = value?.confidence === "high" ? "high" : "low";
  const reasoning = typeof value?.reasoning === "string" ? value.reasoning.slice(0, 240) : "No reasoning returned.";
  return { category, confidence, reasoning };
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return text.slice(start, end + 1);
}

function repairLooseJson(text: string) {
  return text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .trim();
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 180);
  return String(error).slice(0, 180);
}
