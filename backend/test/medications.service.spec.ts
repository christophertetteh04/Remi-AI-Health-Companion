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
