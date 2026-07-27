import { BadRequestException } from "@nestjs/common";
import { AccountDataService } from "../src/account-data/account-data.service";

describe("AccountDataService", () => {
  it("requires the DELETE confirmation phrase", async () => {
    const service = new AccountDataService({ client: {} } as any);
    await expect(service.deleteForUser("user-1", "auth-1", "NOPE" as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("deletes only the authenticated user's app row after collecting owned storage paths", async () => {
    const eqUser = jest.fn().mockResolvedValue({ error: null });
    const eqId = jest.fn(() => ({ eq: eqUser }));
    const deleteUsers = jest.fn(() => ({ eq: eqId }));
    const remove = jest.fn().mockResolvedValue({ error: null });
    const select = jest.fn((column: string) => ({
      eq: jest.fn().mockResolvedValue({ data: [{ [column]: "user-1/file.jpg" }], error: null }),
    }));
    const from = jest.fn((table: string) => (table === "users" ? { delete: deleteUsers } : { select }));
    const service = new AccountDataService({
      client: {
        from,
        storage: { from: jest.fn(() => ({ remove })) },
        auth: { admin: { deleteUser: jest.fn().mockResolvedValue({}) } },
      },
    } as any);

    await expect(service.deleteForUser("user-1", "auth-1", "DELETE")).resolves.toEqual({ deleted: true });
    expect(eqId).toHaveBeenCalledWith("id", "user-1");
    expect(eqUser).toHaveBeenCalledWith("auth_user_id", "auth-1");
    expect(remove).toHaveBeenCalled();
  });
});
