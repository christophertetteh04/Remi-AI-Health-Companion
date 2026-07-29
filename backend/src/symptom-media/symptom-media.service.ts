import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";
import { EncryptionService } from "../common/encryption.service";
import { randomUUID } from "crypto";

@Injectable()
export class SymptomMediaService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async storePhoto(userId: string, imageBase64: string, bodyLocation: string) {
    return this.storePhotoBuffer(userId, Buffer.from(imageBase64, "base64"), bodyLocation);
  }

  async storePhotoBuffer(userId: string, buffer: Buffer, bodyLocation: string) {
    const fileName = `${userId}/${randomUUID()}.jpg`;
    if (buffer.length > 6_000_000) throw new Error("Image is too large");
    await ensureBucket(this.supabase.client, "symptom-photos");
    const { error: uploadError } = await this.supabase.client.storage
      .from("symptom-photos")
      .upload(fileName, buffer, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;

    // Signed URL rather than public — symptom photos are sensitive.
    const { data: signed } = await this.supabase.client.storage
      .from("symptom-photos")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

    const { data: episode, error } = await this.supabase.client
      .from("symptom_episodes")
      .insert({
        user_id: userId,
        description: this.encryption.encrypt(`Photo attached — location: ${bodyLocation}`),
        photo_path: fileName,
        body_location: bodyLocation,
      })
      .select()
      .single();
    if (error) throw error;

    return { episodeId: episode.id, bodyLocation, photoUrl: signed?.signedUrl };
  }
}

async function ensureBucket(client: any, bucket: string) {
  const { data } = await client.storage.getBucket(bucket);
  if (data) return;
  const { error } = await client.storage.createBucket(bucket, { public: false });
  if (error && !/already exists/i.test(error.message || "")) throw error;
}
