import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";
import { EncryptionService } from "../common/encryption.service";

@Injectable()
export class WomensHealthService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async listCycleEntries(userId: string) {
    const { data, error } = await this.supabase.client
      .from("cycle_entries")
      .select("*")
      .eq("user_id", userId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    const entries = (data || []).map((row) => ({ ...row, symptoms: this.encryption.decrypt(row.symptoms) }));

    // Simple, descriptive-only irregularity note — never diagnostic.
    // Uses the last few cycles' length to flag a notable deviation,
    // same non-diagnostic pattern as everything else in the app.
    let irregularityNote: string | null = null;
    if (entries.length >= 3) {
      const lengths: number[] = [];
      for (let i = 0; i < entries.length - 1; i++) {
        const a = new Date(entries[i].start_date).getTime();
        const b = new Date(entries[i + 1].start_date).getTime();
        lengths.push(Math.round((a - b) / (1000 * 60 * 60 * 24)));
      }
      const avg = lengths.slice(1).reduce((s, n) => s + n, 0) / Math.max(lengths.length - 1, 1);
      const latest = lengths[0];
      if (Math.abs(latest - avg) > 7) {
        irregularityNote = "Your most recent cycle length is noticeably different from your recent average — worth mentioning to your doctor.";
      }
    }

    return { entries, irregularityNote };
  }

  async logCycleEntry(userId: string, entry: { startDate: string; endDate: string | null; flow: string; symptoms: string }) {
    const { data, error } = await this.supabase.client
      .from("cycle_entries")
      .insert({
        user_id: userId,
        start_date: entry.startDate,
        end_date: entry.endDate,
        flow: entry.flow,
        symptoms: this.encryption.encrypt(entry.symptoms || ""),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async listMenopauseEntries(userId: string) {
    const { data, error } = await this.supabase.client
      .from("menopause_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({ ...row, mood_note: this.encryption.decrypt(row.mood_note) }));
  }

  async logMenopauseEntry(userId: string, entry: { hotFlashes: boolean; moodNote: string; sleepDisruption: boolean }) {
    const { data, error } = await this.supabase.client
      .from("menopause_entries")
      .insert({
        user_id: userId,
        hot_flashes: entry.hotFlashes,
        mood_note: this.encryption.encrypt(entry.moodNote || ""),
        sleep_disruption: entry.sleepDisruption,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
