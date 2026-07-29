import { SymptomMediaService } from "../src/symptom-media/symptom-media.service";

describe("SymptomMediaService", () => {
  it("creates the private symptom photo bucket when it is missing", async () => {
    const storageBucket = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: "signed-url" } }),
    };
    const insertQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: "episode-1" }, error: null }),
    };
    const client = {
      storage: {
        getBucket: jest.fn().mockResolvedValue({ data: null }),
        createBucket: jest.fn().mockResolvedValue({ data: {}, error: null }),
        from: jest.fn(() => storageBucket),
      },
      from: jest.fn(() => insertQuery),
    };
    const encryption = { encrypt: jest.fn((value) => `encrypted:${value}`) };
    const service = new SymptomMediaService({ client } as any, encryption as any);

    const result = await service.storePhotoBuffer("user-1", Buffer.from("photo"), "Arm");

    expect(client.storage.createBucket).toHaveBeenCalledWith("symptom-photos", { public: false });
    expect(storageBucket.upload).toHaveBeenCalled();
    expect(result).toEqual({ episodeId: "episode-1", bodyLocation: "Arm", photoUrl: "signed-url" });
  });
});
