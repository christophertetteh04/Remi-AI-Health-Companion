import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";

// IMPORTANT: this module (and pain-crises alongside it) is flagged
// as pending clinical advisor review before real users rely on it —
// see AI-BUILD-PROMPTS.md #12 and the flow doc action items. The
// code is real and functional; the clinical content/thresholds are
// not yet signed off.
export const TRACKABLE_CONDITIONS = [
  "sickle_cell",
  "hiv_art_adherence",
  "asthma",
  "kidney",
  "cholesterol",
  "thyroid",
] as const;

@Injectable()
export class ConditionsService {
  constructor(private readonly supabase: SupabaseService) {}

  async listForUser(userId: string) {
    const { data, error } = await this.supabase.client
      .from("tracked_conditions")
      .select("condition")
      .eq("user_id", userId)
      .eq("enabled", true);
    if (error) throw error;
    return { tracked: (data || []).map((r) => r.condition), available: TRACKABLE_CONDITIONS };
  }

  async toggle(userId: string, condition: string, enabled: boolean) {
    if (!TRACKABLE_CONDITIONS.includes(condition as any)) {
      throw new Error(`Unknown condition: ${condition}`);
    }
    const { data, error } = await this.supabase.client
      .from("tracked_conditions")
      .upsert({ user_id: userId, condition, enabled }, { onConflict: "user_id,condition" })
      .select();
    if (error) throw error;
    return data;
  }
}
