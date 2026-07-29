import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { MedicationsService } from "../src/medications/medications.service";
import { SupabaseService } from "../src/common/supabase.service";

describe("MedicationsService.checkAgainstAllergies", () => {
  let service: MedicationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MedicationsService, { provide: SupabaseService, useValue: { client: {} } }],
    }).compile();
    service = module.get<MedicationsService>(MedicationsService);
  });

  it("flags an exact match, case-insensitively", async () => {
    const result = await service.checkAgainstAllergies("Penicillin", ["penicillin"]);
    expect(result.conflict).toBe(true);
  });

  it("flags a match with surrounding whitespace", async () => {
    const result = await service.checkAgainstAllergies("  Penicillin  ", ["Penicillin"]);
    expect(result.conflict).toBe(true);
  });

  it("does NOT flag a different drug that merely sounds similar — exact match only", async () => {
    const result = await service.checkAgainstAllergies("Amoxicillin", ["Penicillin"]);
    expect(result.conflict).toBe(false);
  });

  it("returns no conflict when the allergy list is empty", async () => {
    const result = await service.checkAgainstAllergies("Metformin", []);
    expect(result.conflict).toBe(false);
  });
});

describe("MedicationsService access control", () => {
  it("rejects marking another user's medication as taken", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const secondEq = jest.fn(() => ({ maybeSingle }));
    const firstEq = jest.fn(() => ({ eq: secondEq }));
    const select = jest.fn(() => ({ eq: firstEq }));
    const insert = jest.fn();
    const from = jest.fn((table: string) => (table === "medications" ? { select } : { insert }));
    const service = new MedicationsService({ client: { from } } as any);

    await expect(service.logTaken("user-a", "med-owned-by-user-b", new Date().toISOString())).rejects.toBeInstanceOf(NotFoundException);
    expect(insert).not.toHaveBeenCalled();
    expect(secondEq).toHaveBeenCalledWith("user_id", "user-a");
  });
});

describe("MedicationsService.create", () => {
  it("retries without conversation_ref when Supabase schema cache is behind", async () => {
    const single = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "PGRST204",
          message: "Could not find the 'conversation_ref' column of 'medications' in the schema cache",
        },
      })
      .mockResolvedValueOnce({ data: { id: "med-1", source: "chat" }, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn((payload: any) => ({ select }));
    const from = jest.fn(() => ({ insert }));
    const service = new MedicationsService({ client: { from } } as any);

    const result = await service.create("user-1", {
      name: "Metformin",
      dose: "500 mg",
      frequency: "Daily",
      source: "chat",
      conversationRef: "turn-1",
    });

    expect(result).toEqual({ id: "med-1", source: "chat" });
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[0][0]).toHaveProperty("conversation_ref", "turn-1");
    expect(insert.mock.calls[1][0]).not.toHaveProperty("conversation_ref");
  });
});

describe("MedicationsService.update", () => {
  it("updates only the current user's medication", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: "med-1", name: "Metformin" }, error: null });
    const secondEq = jest.fn(() => ({ select: () => ({ maybeSingle }) }));
    const firstEq = jest.fn(() => ({ eq: secondEq }));
    const update = jest.fn(() => ({ eq: firstEq }));
    const service = new MedicationsService({ client: { from: jest.fn(() => ({ update })) } } as any);

    const result = await service.update("user-1", "med-1", { name: "Metformin", dose: "500 mg", frequency: "Daily", hour: 8, minute: 30 });

    expect(result).toEqual({ id: "med-1", name: "Metformin" });
    expect(update).toHaveBeenCalledWith({ name: "Metformin", dose: "500 mg", frequency: "Daily", time_of_day: "8:30" });
    expect(firstEq).toHaveBeenCalledWith("id", "med-1");
    expect(secondEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("rejects editing another user's medication", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const secondEq = jest.fn(() => ({ select: () => ({ maybeSingle }) }));
    const firstEq = jest.fn(() => ({ eq: secondEq }));
    const update = jest.fn(() => ({ eq: firstEq }));
    const service = new MedicationsService({ client: { from: jest.fn(() => ({ update })) } } as any);

    await expect(service.update("user-1", "med-owned-by-other", { name: "Other" })).rejects.toBeInstanceOf(NotFoundException);
  });
});
