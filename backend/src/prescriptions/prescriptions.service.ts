import { Injectable, Optional } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PosthogService } from "../common/posthog.service";

// A small starter list for the "unrecognized drug name" flag.
// In production, replace this with a real drug reference source
// (RxNorm / OpenFDA / a licensed API) — see flow doc section 14.
const KNOWN_DRUGS = [
  "amlodipine", "metformin", "amoxicillin", "paracetamol", "ibuprofen",
  "losartan", "atorvastatin", "omeprazole", "artemether", "lumefantrine",
];

const DRUG_REFERENCE: Record<string, { displayName: string; explanation: string }> = {
  amlodipine: { displayName: "Amlodipine", explanation: "Used to help lower blood pressure." },
  metformin: { displayName: "Metformin", explanation: "Used to help manage blood sugar levels." },
  amoxicillin: { displayName: "Amoxicillin", explanation: "Amoxicillin is an antibiotic used for some bacterial infections when prescribed by a clinician." },
  paracetamol: { displayName: "Paracetamol", explanation: "Paracetamol is commonly used to reduce pain or fever." },
  ibuprofen: { displayName: "Ibuprofen", explanation: "Ibuprofen is commonly used to reduce pain, fever, or inflammation." },
  losartan: { displayName: "Losartan", explanation: "Losartan is commonly used to help lower blood pressure." },
  atorvastatin: { displayName: "Atorvastatin", explanation: "Atorvastatin is commonly used to help lower cholesterol." },
  omeprazole: { displayName: "Omeprazole", explanation: "Omeprazole is commonly used to reduce stomach acid." },
  artemether: { displayName: "Artemether", explanation: "Artemether is used as part of some prescribed antimalarial treatments." },
  lumefantrine: { displayName: "Lumefantrine", explanation: "Lumefantrine is used as part of some prescribed antimalarial treatments." },
};

const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.6-flash"];

const PRESCRIPTION_SCAN_PROMPT = `
You read prescription label or medication package images for Remi.
Return ONLY strict JSON in this shape:
{"drugName": string, "dose": string, "frequency": string, "duration": string, "confidence": "low" | "medium" | "high", "note": string | null}

Rules:
- Identify only what is visible or strongly readable in the image.
- drugName should be the medication name only, without dosage instructions.
- Extract dose, frequency, and duration only when visibly present.
- Do not diagnose the user.
- Do not tell the user to start, stop, change, or continue a medication.
- Do not guess dose, frequency, duration, or reminders; empty strings are safer than guesses.
- If the medication name is unclear, use an empty string, confidence "low",
  and a note asking the user to type the medication name from the package or prescription.
`;

@Injectable()
export class PrescriptionsService {
  private gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  constructor(@Optional() private readonly posthog?: PosthogService) {}

  // OCR call — plug in Google Cloud Vision or AWS Textract here.
  // Left as a clearly-marked stub since it needs your API credentials;
  // the parsing/confirmation logic around it is real and functional.
  private async runOcr(imageBase64: string): Promise<string> {
    // Example shape for Google Cloud Vision:
    //
    // const vision = new ImageAnnotatorClient();
    // const [result] = await vision.textDetection({
    //   image: { content: imageBase64 },
    // });
    // return result.fullTextAnnotation?.text ?? "";
    //
    // TODO: wire up real credentials and uncomment the call above.
    throw new Error(
      "OCR provider not configured — add Google Cloud Vision or AWS Textract credentials in prescriptions.service.ts",
    );
  }

  async extractDraft(userId: string, imageBase64: string, analyticsEnabled = true) {
    this.posthog?.capture(userId, "prescription_scanned", undefined, analyticsEnabled);

    if (process.env.GEMINI_API_KEY) {
      try {
        const identified = await this.identifyMedication(imageBase64);
        const drugNameGuess = identified.drugName.trim().split(/\s+/)[0]?.toLowerCase() || "";
        const knownDrug = drugNameGuess ? KNOWN_DRUGS.includes(drugNameGuess) : null;
        const reference = referenceForDrug(identified.drugName);
        return {
          drugName: identified.drugName,
          purpose: reference?.explanation || "",
          medicationExplanation: reference?.explanation || "",
          dose: identified.dose,
          frequency: identified.frequency,
          duration: identified.duration,
          confidence: identified.confidence,
          knownDrug,
          rawText: "",
          note: identified.note,
        };
      } catch (error) {
        console.warn("Prescription image model fallback used:", safeErrorMessage(error));
      }
    }

    let rawText = "";
    try {
      rawText = await this.runOcr(imageBase64);
    } catch (e) {
      // Fail safely into an empty draft rather than guessing —
      // the user fills the fields in manually via the confirmation UI.
      return {
        drugName: "",
        purpose: "",
        medicationExplanation: "",
        dose: "",
        frequency: "",
        duration: "",
        confidence: "low" as const,
        knownDrug: null,
        rawText: "",
        note: "We couldn't identify this medication clearly — please type the medication name and the remaining details from your prescription.",
      };
    }

    // Very simple heuristic parse — deliberately conservative.
    // Real handwriting OCR needs much more robust parsing; this is a
    // starting point, not a finished extraction pipeline.
    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
    const drugLine = lines[0] || "";
    const doseMatch = rawText.match(/(\d+\s?(mg|mcg|ml|g))/i);
    const freqMatch = rawText.match(/(once|twice|three times|\d+x)\s?(daily|a day|per day)/i);
    const durationMatch = rawText.match(/(\d+\s?(day|days|week|weeks|month|months))/i);

    const drugNameGuess = drugLine.split(" ")[0]?.toLowerCase() || "";
    const knownDrug = KNOWN_DRUGS.includes(drugNameGuess);
    const reference = referenceForDrug(drugLine);

    return {
      drugName: drugLine,
      purpose: reference?.explanation || "",
      medicationExplanation: reference?.explanation || "",
      dose: doseMatch?.[0] || "",
      frequency: freqMatch?.[0] || "",
      duration: durationMatch?.[0] || "",
      confidence: doseMatch && freqMatch ? "medium" : "low",
      knownDrug,
      rawText,
      note: knownDrug
        ? null
        : "We couldn't confirm this medication name against our reference list — please double-check it against the physical prescription.",
    };
  }

  private async identifyMedication(imageBase64: string) {
    const configured = process.env.GEMINI_PRESCRIPTIONS_MODEL || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const candidates = [...new Set([configured, ...GEMINI_MODEL_FALLBACKS])];
    let lastError: unknown;

    for (const modelName of candidates) {
      try {
        const model = this.gemini.getGenerativeModel({
          model: modelName,
          systemInstruction: PRESCRIPTION_SCAN_PROMPT,
          generationConfig: { maxOutputTokens: 450, responseMimeType: "application/json" },
        });
        const response = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
                { text: "Extract the prescription draft fields from this image." },
              ],
            },
          ],
        });
        const parsed = parsePrescriptionJson(response.response.text() || "{}");
        return normalizePrescriptionDraft(parsed);
      } catch (error) {
        lastError = error;
        if (!isRetryablePrescriptionModelError(error)) throw error;
      }
    }

    throw lastError;
  }
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 180);
  return String(error).slice(0, 180);
}

function isRetryablePrescriptionModelError(error: unknown) {
  const message = safeErrorMessage(error);
  return /404|not found|not.*supported|models\/.+not|json|unterminated|unexpected token|unexpected end/i.test(message);
}

function parsePrescriptionJson(text: string) {
  const extracted = extractJsonObject(text);
  const jsonText = extracted || text;
  try {
    return JSON.parse(jsonText);
  } catch {
    try {
      return JSON.parse(repairLooseJson(jsonText));
    } catch {
      const salvaged = salvagePrescriptionFields(jsonText);
      if (Object.keys(salvaged).length) return salvaged;
      throw new SyntaxError("Could not parse prescription JSON");
    }
  }
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  return text.slice(start, end + 1);
}

function normalizePrescriptionDraft(parsed: any) {
  return {
    drugName: typeof parsed.drugName === "string" ? parsed.drugName.trim() : "",
    dose: typeof parsed.dose === "string" ? parsed.dose.trim() : "",
    frequency: typeof parsed.frequency === "string" ? parsed.frequency.trim() : "",
    duration: typeof parsed.duration === "string" ? parsed.duration.trim() : "",
    confidence: parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "low",
    note: typeof parsed.note === "string" && parsed.note.trim() ? parsed.note.trim() : null,
  };
}

function repairLooseJson(text: string) {
  return text
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .trim();
}

function salvagePrescriptionFields(text: string) {
  return {
    ...pickStringField(text, "drugName"),
    ...pickStringField(text, "dose"),
    ...pickStringField(text, "frequency"),
    ...pickStringField(text, "duration"),
    ...pickStringField(text, "confidence"),
    ...pickStringField(text, "note"),
  };
}

function pickStringField(text: string, key: string) {
  const match = text.match(new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']*)`, "i"));
  return match ? { [key]: match[1].trim() } : {};
}

function referenceForDrug(drugName: string) {
  const firstWord = drugName.trim().split(/\s+/)[0]?.toLowerCase();
  if (!firstWord) return null;
  return DRUG_REFERENCE[firstWord] || null;
}
