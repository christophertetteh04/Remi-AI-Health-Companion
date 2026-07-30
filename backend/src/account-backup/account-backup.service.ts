import { Injectable } from "@nestjs/common";
import { EncryptionService } from "../common/encryption.service";
import { SupabaseService } from "../common/supabase.service";

@Injectable()
export class AccountBackupService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async get(userId: string) {
    const { data, error } = await this.supabase.client
      .from("account_backups")
      .select("encrypted_payload, schema_version, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (isMissingBackupTable(error)) return null;
    if (error) throw error;
    if (!data?.encrypted_payload) return null;

    try {
      return {
        data: JSON.parse(this.encryption.decrypt(data.encrypted_payload)),
        schemaVersion: data.schema_version || "1",
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  async save(userId: string, data: Record<string, unknown>, schemaVersion = "1") {
    const payload = this.encryption.encrypt(JSON.stringify(data || {}));
    const { error } = await this.supabase.client
      .from("account_backups")
      .upsert({
        user_id: userId,
        encrypted_payload: payload,
        schema_version: schemaVersion,
        updated_at: new Date().toISOString(),
      });
    if (isMissingBackupTable(error)) return { saved: false, pendingSchema: true };
    if (error) throw error;
    return { saved: true, schemaVersion };
  }
}

function isMissingBackupTable(error: any) {
  return error?.code === "PGRST205" || /account_backups|Could not find the table/i.test(String(error?.message || ""));
}
