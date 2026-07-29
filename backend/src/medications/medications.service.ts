import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";
import { PosthogService } from "../common/posthog.service";

@Injectable()
export class MedicationsService {
  constructor(
    private readonly supabase: SupabaseService,
    @Optional()
    private readonly posthog?: PosthogService,
  ) {}

  async listForUser(userId: string) {
    const { data, error } = await this.supabase.client
      .from("medications")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data;
  }

  async create(userId: string, med: { name: string; dose: string; frequency: string; hour?: number; minute?: number; source?: string; conversationRef?: string }) {
    const payload = {
      user_id: userId,
      name: med.name,
      dose: med.dose,
      frequency: med.frequency,
      time_of_day: med.hour != null ? `${med.hour}:${med.minute ?? 0}` : null,
      source: med.source || "manual",
      conversation_ref: med.conversationRef || null,
    };
    const { data, error } = await this.supabase.client
      .from("medications")
      .insert(payload)
      .select()
      .single();
    if (isMissingColumnError(error, "conversation_ref")) {
      const { conversation_ref: _conversationRef, ...legacyPayload } = payload;
      const retry = await this.supabase.client
        .from("medications")
        .insert(legacyPayload)
        .select()
        .single();
      if (retry.error) throw retry.error;
      return retry.data;
    }
    if (error) throw error;
    return data;
  }

  async logTaken(userId: string, medicationId: string, takenAt: string, analyticsEnabled = true) {
    const { data: medication, error: medicationError } = await this.supabase.client
      .from("medications")
      .select("id")
      .eq("id", medicationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (medicationError) throw medicationError;
    if (!medication) throw new NotFoundException("Medication not found");

    const { data, error } = await this.supabase.client
      .from("medication_logs")
      .insert({ medication_id: medicationId, taken_at: takenAt });
    if (error) throw error;
    this.posthog?.capture(userId, "medication_marked_taken", undefined, analyticsEnabled);
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

function isMissingColumnError(error: any, column: string) {
  return error?.code === "PGRST204" && typeof error?.message === "string" && error.message.includes(`'${column}' column`);
}
