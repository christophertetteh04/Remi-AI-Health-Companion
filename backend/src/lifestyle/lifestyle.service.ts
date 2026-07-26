import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";
import { EncryptionService } from "../common/encryption.service";

@Injectable()
export class LifestyleService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async listForUser(userId: string, type?: string) {
    let query = this.supabase.client
      .from("lifestyle_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (type) query = query.eq("entry_type", type);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      note: row.note ? this.encryption.decrypt(row.note) : null,
    }));
  }

  async log(userId: string, entryType: string, fields: Record<string, any>) {
    // Substance-use notes are the one field here worth encrypting —
    // sleep/activity numbers aren't sensitive text, but keep the
    // same careful, non-judgmental tone in the UI copy either way.
    const note = fields.note ? this.encryption.encrypt(fields.note) : null;
    const { data, error } = await this.supabase.client
      .from("lifestyle_entries")
      .insert({ user_id: userId, entry_type: entryType, data: { ...fields, note: undefined }, note })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async logWeight(userId: string, weightKg: number, heightCm?: number) {
    const bmi = heightCm ? Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1)) : null;
    const { data, error } = await this.supabase.client
      .from("lifestyle_entries")
      .insert({ user_id: userId, entry_type: "weight", data: { weightKg, heightCm, bmi } })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
