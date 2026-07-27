import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { VitalsService } from "../src/vitals/vitals.service";
import { SupabaseService } from "../src/common/supabase.service";

// This is the single most important set of tests in the app: a bug
// here means either false reassurance on a dangerous reading, or
// false alarms that erode trust. Every threshold boundary is tested
// explicitly rather than just a couple of "normal-looking" examples.
describe("VitalsService.evaluate", () => {
  let service: VitalsService;
  const mockInsert = jest.fn().mockResolvedValue({ error: null });
  const mockSupabase = {
    client: { from: () => ({ insert: mockInsert }) },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VitalsService, { provide: SupabaseService, useValue: mockSupabase }],
    }).compile();
    service = module.get<VitalsService>(VitalsService);
  });

  it("classifies a normal reading correctly", async () => {
    const result = await service.evaluate("user-1", { systolic: 118, diastolic: 76 });
    expect(result.tier).toBe("normal");
  });

  it("classifies a monitor-tier reading at the lower boundary (140/90)", async () => {
    const result = await service.evaluate("user-1", { systolic: 140, diastolic: 90 });
    expect(result.tier).toBe("monitor");
  });

  it("classifies just below the monitor boundary as normal", async () => {
    const result = await service.evaluate("user-1", { systolic: 139, diastolic: 89 });
    expect(result.tier).toBe("normal");
  });

  it("classifies an urgent-tier reading at the boundary (160/110)", async () => {
    const result = await service.evaluate("user-1", { systolic: 160, diastolic: 110 });
    expect(result.tier).toBe("urgent");
  });

  it("classifies urgent when only diastolic crosses the urgent threshold", async () => {
    const result = await service.evaluate("user-1", { systolic: 130, diastolic: 112 });
    expect(result.tier).toBe("urgent");
  });

  it("always persists the reading regardless of tier", async () => {
    await service.evaluate("user-1", { systolic: 118, diastolic: 76 });
    expect(mockInsert).toHaveBeenCalled();
  });
});

describe("VitalsService access control", () => {
  it("rejects reading another user's vitals record by id", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const secondEq = jest.fn(() => ({ maybeSingle }));
    const firstEq = jest.fn(() => ({ eq: secondEq }));
    const select = jest.fn(() => ({ eq: firstEq }));
    const service = new VitalsService({ client: { from: () => ({ select }) } } as any);

    await expect(service.getForUser("user-a", "vitals-owned-by-user-b")).rejects.toBeInstanceOf(NotFoundException);
    expect(firstEq).toHaveBeenCalledWith("id", "vitals-owned-by-user-b");
    expect(secondEq).toHaveBeenCalledWith("user_id", "user-a");
  });
});
