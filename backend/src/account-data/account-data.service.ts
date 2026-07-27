import { BadRequestException, Injectable } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";

@Injectable()
export class AccountDataService {
  constructor(private readonly supabase: SupabaseService) {}

  async deleteForUser(userId: string, authUserId: string, confirmation: "DELETE") {
    if (confirmation !== "DELETE") throw new BadRequestException("Deletion confirmation is required");

    const [symptomPaths, samplePaths, imagingPaths] = await Promise.all([
      this.paths("symptom_episodes", userId, "photo_path"),
      this.paths("sample_photos", userId, "photo_path"),
      this.paths("imaging_records", userId, "photo_path"),
    ]);

    await Promise.all([
      this.removeStorage("symptom-photos", symptomPaths),
      this.removeStorage("sample-photos", samplePaths),
      this.removeStorage("imaging-files", imagingPaths),
    ]);

    const { error: userError } = await this.supabase.client
      .from("users")
      .delete()
      .eq("id", userId)
      .eq("auth_user_id", authUserId);
    if (userError) throw userError;

    await this.supabase.client.auth.admin.deleteUser(authUserId).catch(() => undefined);
    return { deleted: true };
  }

  private async paths(table: string, userId: string, column: string) {
    const { data, error } = await this.supabase.client
      .from(table as any)
      .select(column)
      .eq("user_id", userId);
    if (error) throw error;
    return (data || []).map((row: any) => row[column]).filter(Boolean);
  }

  private async removeStorage(bucket: string, paths: string[]) {
    if (!paths.length) return;
    await this.supabase.client.storage.from(bucket).remove(paths);
  }
}
