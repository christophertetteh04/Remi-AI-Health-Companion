import { NotFoundException } from "@nestjs/common";
import { LabsService } from "../src/labs/labs.service";

describe("LabsService access control", () => {
  it("rejects reading another user's lab report by id", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const secondEq = jest.fn(() => ({ maybeSingle }));
    const firstEq = jest.fn(() => ({ eq: secondEq }));
    const select = jest.fn(() => ({ eq: firstEq }));
    const service = new LabsService({ client: { from: () => ({ select }) } } as any, { decrypt: jest.fn(), encrypt: jest.fn() } as any);

    await expect(service.getForUser("user-a", "lab-owned-by-user-b")).rejects.toBeInstanceOf(NotFoundException);
    expect(firstEq).toHaveBeenCalledWith("id", "lab-owned-by-user-b");
    expect(secondEq).toHaveBeenCalledWith("user_id", "user-a");
  });
});
