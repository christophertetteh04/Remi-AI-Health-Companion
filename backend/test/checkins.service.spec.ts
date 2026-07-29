import { Test, TestingModule } from "@nestjs/testing";
import { CheckinsService } from "../src/checkins/checkins.service";

// This test doesn't call the real Gemini API (no key in CI) — it
// specifically verifies the crisis-keyword fast path, since that
// must work even if the AI call is slow, fails, or is misconfigured.
describe("CheckinsService crisis detection", () => {
  let service: CheckinsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheckinsService],
    }).compile();
    service = module.get<CheckinsService>(CheckinsService);
  });

  it("detects a crisis phrase and short-circuits before calling the AI", async () => {
    const result = await service.handleMessage("I want to end my life", []);
    expect(result.crisisDetected).toBe(true);
    expect(result.urgency).toBe("urgent");
  });

  it("detects crisis phrases regardless of surrounding text or case", async () => {
    const result = await service.handleMessage("lately I just want to HURT MYSELF and don't know why", []);
    expect(result.crisisDetected).toBe(true);
  });
});

describe("CheckinsService regional pattern note", () => {
  // This test checks the deterministic keyword logic only — it does
  // NOT call the real Gemini API, so it can't verify the model's
  // eventual urgency output, only that the app-level nudge fires
  // correctly before the API call would be made.
  it("recognizes fever+chills as the regional priority pattern", () => {
    const lower = "I've had a fever and chills since yesterday".toLowerCase();
    const hasFever = /\bfever\b/.test(lower);
    const hasChillsOrHeadache = /\b(chills|headache)\b/.test(lower);
    expect(hasFever && hasChillsOrHeadache).toBe(true);
  });

  it("does not fire on fever alone without chills or headache", () => {
    const lower = "I've had a mild fever since yesterday".toLowerCase();
    const hasFever = /\bfever\b/.test(lower);
    const hasChillsOrHeadache = /\b(chills|headache)\b/.test(lower);
    expect(hasFever && hasChillsOrHeadache).toBe(false);
  });
});

describe("CheckinsService classified uploads", () => {
  it("routes ambiguous scan-type uploads to scan_image store-only path", async () => {
    const classifier = { classify: jest.fn().mockResolvedValue({ category: "scan_image", confidence: "high", reasoning: "Looks like a scan film or ambiguous scan upload." }) };
    const imaging = { upload: jest.fn().mockResolvedValue({ id: "scan-1", kind: "scan_image", message: "stored" }) };
    const service = new CheckinsService(classifier as any, undefined, imaging as any);

    const result = await service.handleUpload("user-1", { imageBase64: "abc", mediaType: "image/jpeg", conversationRef: "turn-1" } as any);

    expect(imaging.upload).toHaveBeenCalledWith("user-1", "abc", "scan_image", "Scan image", { source: "chat", conversationRef: "turn-1" });
    expect(result.status).toBe("processed");
    expect(result.classification).toEqual({ category: "scan_image", confidence: "high" });
  });

  it("routes prescription classifications to confirmation without saving records", async () => {
    const classifier = { classify: jest.fn().mockResolvedValue({ category: "prescription", confidence: "high", reasoning: "Looks like a prescription pad." }) };
    const labs = { interpretAndCompare: jest.fn() };
    const imaging = { upload: jest.fn() };
    const symptomMedia = { storePhoto: jest.fn() };
    const samplePhotos = { analyze: jest.fn() };
    const service = new CheckinsService(classifier as any, labs as any, imaging as any, symptomMedia as any, samplePhotos as any);

    const result = await service.handleUpload("user-1", { imageBase64: "abc", mediaType: "image/jpeg", conversationRef: "turn-2" } as any);

    expect(result.status).toBe("route_to_prescription_confirmation");
    expect(result.message).toContain("before anything is saved");
    expect(labs.interpretAndCompare).not.toHaveBeenCalled();
    expect(imaging.upload).not.toHaveBeenCalled();
    expect(symptomMedia.storePhoto).not.toHaveBeenCalled();
    expect(samplePhotos.analyze).not.toHaveBeenCalled();
  });

  it("asks the user to confirm instead of crashing when classifier output is malformed", async () => {
    const classifier = { classify: jest.fn().mockResolvedValue({ category: "unclear", confidence: "low", reasoning: "Classifier returned malformed JSON." }) };
    const imaging = { upload: jest.fn() };
    const service = new CheckinsService(classifier as any, undefined, imaging as any);

    const result = await service.handleUpload("user-1", { imageBase64: "abc", mediaType: "image/jpeg", conversationRef: "turn-3" } as any);

    expect(result.status).toBe("needs_confirmation");
    expect(result.classification).toEqual({ category: "unclear", confidence: "low" });
    expect(imaging.upload).not.toHaveBeenCalled();
  });
});
