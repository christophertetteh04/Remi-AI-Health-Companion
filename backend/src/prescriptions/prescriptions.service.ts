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

const GEMINI_MODEL = "gemini-2.5-flash";

const PRESCRIPTION_SCAN_PROMPT = `
You read prescription label or medication package images for Remi.
Return ONLY strict JSON in this shape:
{"drugName": string, "purpose": string, "confidence": "low" | "medium" | "high", "note": string | null}

Rules:
- Identify only what is visible or strongly readable in the image.
- drugName should be the medication name only, without dosage instructions.
- purpose should explain in plain language what the medication is generally used for.
- Do not diagnose the user.
- Do not tell the user to start, stop, change, or continue a medication.
- Do not guess dose, frequency, duration, or reminders; the user must enter those.
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
        return {
          drugName: identified.drugName,
          purpose: identified.purpose,
          dose: "",
          frequency: "",
          duration: "",
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

    const drugNameGuess = drugLine.split(" ")[0]?.toLowerCase() || "";
    const knownDrug = KNOWN_DRUGS.includes(drugNameGuess);

    return {
      drugName: drugLine,
      purpose: "",
      dose: doseMatch?.[0] || "",
      frequency: freqMatch?.[0] || "",
      duration: "",
      confidence: doseMatch && freqMatch ? "medium" : "low",
      knownDrug,
      rawText,
      note: knownDrug
        ? null
        : "We couldn't confirm this medication name against our reference list — please double-check it against the physical prescription.",
    };
  }

  private async identifyMedication(imageBase64: string) {
    const model = this.gemini.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: PRESCRIPTION_SCAN_PROMPT,
      generationConfig: { maxOutputTokens: 450, responseMimeType: "application/json" },
    });
    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
            { text: "Identify the medication name and its general purpose from this image." },
          ],
        },
      ],
    });
    const parsed = JSON.parse(response.response.text() || "{}");
    return {
      drugName: typeof parsed.drugName === "string" ? parsed.drugName.trim() : "",
      purpose: typeof parsed.purpose === "string" ? parsed.purpose.trim() : "",
      confidence: parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "low",
      note: typeof parsed.note === "string" && parsed.note.trim() ? parsed.note.trim() : null,
    };
  }
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 180);
  return String(error).slice(0, 180);
}
