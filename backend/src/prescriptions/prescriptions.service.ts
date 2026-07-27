import { Injectable, Optional } from "@nestjs/common";
import { PosthogService } from "../common/posthog.service";

// A small starter list for the "unrecognized drug name" flag.
// In production, replace this with a real drug reference source
// (RxNorm / OpenFDA / a licensed API) — see flow doc section 14.
const KNOWN_DRUGS = [
  "amlodipine", "metformin", "amoxicillin", "paracetamol", "ibuprofen",
  "losartan", "atorvastatin", "omeprazole", "artemether", "lumefantrine",
];

@Injectable()
export class PrescriptionsService {
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
    let rawText = "";
    try {
      rawText = await this.runOcr(imageBase64);
    } catch (e) {
      this.posthog?.capture(userId, "prescription_scanned", undefined, analyticsEnabled);
      // Fail safely into an empty draft rather than guessing —
      // the user fills the fields in manually via the confirmation UI.
      return {
        drugName: "",
        dose: "",
        frequency: "",
        duration: "",
        confidence: "low" as const,
        knownDrug: null,
        rawText: "",
        note: "Automatic scanning isn't available yet — please enter the details from your prescription manually.",
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

    this.posthog?.capture(userId, "prescription_scanned", undefined, analyticsEnabled);
    return {
      drugName: drugLine,
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
}
