import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";

@Injectable()
export class MedicationsService {
  constructor(private readonly supabase: SupabaseService) {}

  async listForUser(userId: string) {
    const { data, error } = await this.supabase.client
      .from("medications")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data;
  }

  async create(userId: string, med: { name: string; dose: string; frequency: string; hour?: number; minute?: number; source?: string }) {
    const { data, error } = await this.supabase.client
      .from("medications")
      .insert({
        user_id: userId,
        name: med.name,
        dose: med.dose,
        frequency: med.frequency,
        time_of_day: med.hour != null ? `${med.hour}:${med.minute ?? 0}` : null,
        source: med.source || "manual",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async logTaken(medicationId: string, takenAt: string) {
    const { data, error } = await this.supabase.client
      .from("medication_logs")
      .insert({ medication_id: medicationId, taken_at: takenAt });
    if (error) throw error;
    return data;
  }

  // Direct-match allergy check only — no interaction reasoning.
  // See flow doc section 14: this stays a simple string match against
  // the user's stated allergy list, never AI-generated interaction logic.
  async checkAgainstAllergies(drugName: string, userAllergies: string[]) {
    const match = userAllergies.find(
      (a) => a.toLowerCase().trim() === drugName.toLowerCase().trim(),
    );
    return match
      ? { conflict: true, message: `This matches a listed allergy: ${match}` }
      : { conflict: false, message: "No known conflict with your listed allergies." };
  }
}
