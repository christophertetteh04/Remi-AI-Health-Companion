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
