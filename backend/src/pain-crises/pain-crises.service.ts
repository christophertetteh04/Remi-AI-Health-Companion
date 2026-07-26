import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";
import { EncryptionService } from "../common/encryption.service";

// Severity threshold for urgent escalation is a DRAFT value pending
// clinical advisor sign-off — do not treat as final. See flow doc
// action items.
const URGENT_SEVERITY_THRESHOLD = 8; // out of 10

@Injectable()
export class PainCrisesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async listForUser(userId: string) {
    const { data, error } = await this.supabase.client
      .from("pain_crises")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({ ...row, trigger_note: this.encryption.decrypt(row.trigger_note) }));
  }

  async log(userId: string, entry: { severity: number; triggerNote: string; location: string }) {
    const tier = entry.severity >= URGENT_SEVERITY_THRESHOLD ? "urgent" : "normal";

    const { data, error } = await this.supabase.client
      .from("pain_crises")
      .insert({
        user_id: userId,
        severity: entry.severity,
        trigger_note: this.encryption.encrypt(entry.triggerNote || ""),
        location: entry.location,
        tier,
      })
      .select()
      .single();
    if (error) throw error;

    return {
      ...data,
      tier,
      urgentMessage: tier === "urgent"
        ? "This is a severe pain level — please seek care now rather than waiting."
        : null,
    };
  }
}
