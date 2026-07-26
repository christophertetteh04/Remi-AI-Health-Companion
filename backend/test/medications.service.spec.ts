import { Test, TestingModule } from "@nestjs/testing";
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
