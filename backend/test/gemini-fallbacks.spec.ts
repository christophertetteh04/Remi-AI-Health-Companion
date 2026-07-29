import { CheckinsService } from "../src/checkins/checkins.service";
import { ImagingService } from "../src/imaging/imaging.service";
import { LabsService } from "../src/labs/labs.service";
import { PrescriptionsService } from "../src/prescriptions/prescriptions.service";
import { SamplePhotosService } from "../src/sample-photos/sample-photos.service";

const malformedGemini = () => ({
  getGenerativeModel: jest.fn(() => ({
    generateContent: jest.fn().mockResolvedValue({
      response: { text: () => "not-json" },
    }),
  })),
});

const truncatedJsonGemini = () => ({
  getGenerativeModel: jest.fn(() => ({
    generateContent: jest.fn().mockResolvedValue({
      response: { text: () => '{"reply":"That sounds rough, please get checked if it keeps going' },
    }),
  })),
});

const encryption = {
  encrypt: jest.fn((value: string) => `encrypted:${value}`),
  decrypt: jest.fn((value: string) => value),
};

describe("Gemini malformed output fallbacks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("CheckinsService falls back when Gemini returns malformed JSON", async () => {
    const service = new CheckinsService();
    (service as any).gemini = malformedGemini();

    const result = await service.handleMessage("I have a mild cough", []);

    expect(result.crisisDetected).toBe(false);
    expect(result.urgency).toBe("normal");
    expect(result.reply.length).toBeGreaterThan(20);
    expect(result.reply).toMatch(/\?/);
  });

  it("CheckinsService repairs a truncated reply JSON string when possible", async () => {
    const previousGeminiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-gemini-key";
    const service = new CheckinsService();
    (service as any).gemini = truncatedJsonGemini();

    const result = await service.handleMessage("I have a mild cough", []);

    expect(result.crisisDetected).toBe(false);
    expect(result.urgency).toBe("normal");
    expect(result.reply).toContain("That sounds rough");

    if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGeminiKey;
  });

  it("LabsService falls back when Gemini returns malformed JSON", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const priorQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle,
    };
    const insertQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "lab-1" }, error: null }),
    };
    const from = jest
      .fn()
      .mockReturnValueOnce(priorQuery)
      .mockReturnValueOnce(insertQuery);
    const service = new LabsService({ client: { from } } as any, encryption as any);
    (service as any).gemini = malformedGemini();

    const result = await service.interpretAndCompare("user-1", "base64-image", "image/jpeg");

    expect(result.testType).toBe("Unknown");
    expect(result.explanation).toBe("We couldn't read this report clearly — please try a clearer photo.");
    expect(result.keyResults).toEqual([]);
    expect(result.savedId).toBe("lab-1");
  });

  it("SamplePhotosService falls back when Gemini returns malformed JSON", async () => {
    const upload = jest.fn().mockResolvedValue({ data: {}, error: null });
    const insertQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "sample-1" }, error: null }),
    };
    const supabase = {
      client: {
        storage: { from: jest.fn(() => ({ upload })) },
        from: jest.fn(() => insertQuery),
      },
    };
    const service = new SamplePhotosService(supabase as any, encryption as any);
    (service as any).gemini = malformedGemini();

    const result = await service.analyze("user-1", "base64-image", "urine");

    expect(result).toEqual({
      id: "sample-1",
      description: "We couldn't read that photo clearly — please try again with better lighting.",
      tier: "normal",
      urgentMessage: null,
    });
  });

  it("ImagingService falls back when Gemini returns malformed JSON", async () => {
    const upload = jest.fn().mockResolvedValue({ data: {}, error: null });
    const insertQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "imaging-1" }, error: null }),
    };
    const supabase = {
      client: {
        storage: { from: jest.fn(() => ({ upload })) },
        from: jest.fn(() => insertQuery),
      },
    };
    const service = new ImagingService(supabase as any, encryption as any);
    (service as any).gemini = malformedGemini();

    const result = await service.upload("user-1", "base64-image", "report_text", "X-ray");

    expect(result).toEqual({
      id: "imaging-1",
      kind: "report_text",
      explanation: "We couldn't read this report clearly — please try a clearer photo, or bring it to your doctor directly.",
    });
  });

  it("PrescriptionsService falls back to manual draft when Gemini returns malformed JSON", async () => {
    const previousGeminiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = "test-gemini-key";
    const service = new PrescriptionsService();
    (service as any).gemini = malformedGemini();

    const result = await service.extractDraft("user-1", "base64-image");

    expect(result).toEqual({
      drugName: "",
      purpose: "",
      dose: "",
      frequency: "",
      duration: "",
      confidence: "low",
      knownDrug: null,
      rawText: "",
      note: "We couldn't identify this medication clearly — please type the medication name and the remaining details from your prescription.",
    });

    if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGeminiKey;
  });
});
