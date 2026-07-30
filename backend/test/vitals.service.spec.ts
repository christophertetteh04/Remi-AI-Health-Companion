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
  const single = jest.fn().mockResolvedValue({
    data: { id: "vital-1", systolic: 118, diastolic: 76, glucose: null, tier: "normal", created_at: new Date().toISOString() },
    error: null,
  });
  const selectAfterInsert = jest.fn(() => ({ single }));
  const mockInsert = jest.fn(() => ({ select: selectAfterInsert }));
  const mockSupabase = {
    client: { from: () => ({ insert: mockInsert }) },
  };

  beforeEach(() => {
    mockInsert.mockClear();
    selectAfterInsert.mockClear();
    single.mockClear();
    single.mockResolvedValue({
      data: { id: "vital-1", systolic: 118, diastolic: 76, glucose: null, tier: "normal", created_at: new Date().toISOString() },
      error: null,
    });
  });

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

  it("returns the saved reading so the app can display it immediately", async () => {
    const result = await service.evaluate("user-1", { systolic: 118, diastolic: 76 });
    expect(result.reading.id).toBe("vital-1");
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

  it("updates only a vitals record owned by the current user", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "vital-1", user_id: "user-a", systolic: 118, diastolic: 76 },
      error: null,
    });
    const getSecondEq = jest.fn(() => ({ maybeSingle }));
    const getFirstEq = jest.fn(() => ({ eq: getSecondEq }));
    const select = jest.fn(() => ({ eq: getFirstEq }));
    const single = jest.fn().mockResolvedValue({
      data: { id: "vital-1", user_id: "user-a", systolic: 124, diastolic: 80, tier: "normal" },
      error: null,
    });
    const updateSelect = jest.fn(() => ({ single }));
    const updateSecondEq = jest.fn(() => ({ select: updateSelect }));
    const updateFirstEq = jest.fn(() => ({ eq: updateSecondEq }));
    const update = jest.fn(() => ({ eq: updateFirstEq }));
    const from = jest.fn()
      .mockReturnValueOnce({ select })
      .mockReturnValueOnce({ update });
    const service = new VitalsService({ client: { from } } as any);

    const result = await service.update("user-a", "vital-1", { systolic: 124, diastolic: 80 });

    expect(result.reading.systolic).toBe(124);
    expect(updateFirstEq).toHaveBeenCalledWith("id", "vital-1");
    expect(updateSecondEq).toHaveBeenCalledWith("user_id", "user-a");
  });

  it("deletes only a vitals record owned by the current user", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: "vital-1", user_id: "user-a", systolic: 118, diastolic: 76 },
      error: null,
    });
    const getSecondEq = jest.fn(() => ({ maybeSingle }));
    const getFirstEq = jest.fn(() => ({ eq: getSecondEq }));
    const select = jest.fn(() => ({ eq: getFirstEq }));
    const deleteSecondEq = jest.fn().mockResolvedValue({ error: null });
    const deleteFirstEq = jest.fn(() => ({ eq: deleteSecondEq }));
    const deleteFn = jest.fn(() => ({ eq: deleteFirstEq }));
    const from = jest.fn()
      .mockReturnValueOnce({ select })
      .mockReturnValueOnce({ delete: deleteFn });
    const service = new VitalsService({ client: { from } } as any);

    const result = await service.remove("user-a", "vital-1");

    expect(result.deleted).toBe(true);
    expect(deleteFirstEq).toHaveBeenCalledWith("id", "vital-1");
    expect(deleteSecondEq).toHaveBeenCalledWith("user_id", "user-a");
  });
});
