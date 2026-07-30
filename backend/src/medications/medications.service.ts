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

  async create(userId: string, med: {
    name: string;
    dose: string;
    frequency: string;
    duration?: string;
    medicationExplanation?: string;
    hour?: number;
    minute?: number;
    source?: string;
    conversationRef?: string;
    prescriptionImageBase64?: string;
    prescriptionImageMediaType?: string;
  }) {
    const prescriptionImageUrl = med.prescriptionImageBase64
      ? await this.storePrescriptionImage(userId, med.prescriptionImageBase64, med.prescriptionImageMediaType || "image/jpeg")
      : null;
    const allergies = await this.listUserAllergies(userId);
    const allergyCheck = await this.checkAgainstAllergies(med.name, allergies);
    const payload = {
      user_id: userId,
      name: med.name,
      dose: med.dose,
      frequency: med.frequency,
      duration: med.duration || null,
      medication_explanation: med.medicationExplanation || null,
      time_of_day: med.hour != null ? `${med.hour}:${med.minute ?? 0}` : null,
      source: med.source || "manual",
      conversation_ref: med.conversationRef || null,
      prescription_image_url: prescriptionImageUrl,
    };
    const { data, error } = await this.supabase.client
      .from("medications")
      .insert(payload)
      .select()
      .single();
    if (isMissingMedicationSchemaError(error)) {
      const {
        conversation_ref: _conversationRef,
        duration: _duration,
        medication_explanation: _medicationExplanation,
        prescription_image_url: _prescriptionImageUrl,
        ...legacyPayload
      } = payload;
      const retry = await this.supabase.client
        .from("medications")
        .insert(legacyPayload)
        .select()
        .single();
      if (retry.error) throw retry.error;
      return { ...retry.data, allergyCheck, medicationExplanation: med.medicationExplanation || null, prescriptionImageUrl };
    }
    if (error) throw error;
    return { ...data, allergyCheck };
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

  async update(userId: string, medicationId: string, med: { name?: string; dose?: string; frequency?: string; hour?: number; minute?: number }) {
    const updates: Record<string, any> = {};
    if (med.name != null) updates.name = med.name;
    if (med.dose != null) updates.dose = med.dose;
    if (med.frequency != null) updates.frequency = med.frequency;
    if (med.hour != null) updates.time_of_day = `${med.hour}:${med.minute ?? 0}`;

    const { data, error } = await this.supabase.client
      .from("medications")
      .update(updates)
      .eq("id", medicationId)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("Medication not found");
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

  private async listUserAllergies(userId: string) {
    const allergies: string[] = [];
    try {
      const { data: allergyRows } = await this.supabase.client
        .from("allergies")
        .select("substance")
        .eq("user_id", userId);
      for (const row of allergyRows || []) {
        if (row.substance) allergies.push(row.substance);
      }
    } catch {
      // Allergy checking is direct-match only and should not block a
      // confirmed prescription save if the optional allergy table is absent.
    }

    try {
      const { data: emergencyInfo } = await this.supabase.client
        .from("emergency_info")
        .select("allergies_text")
        .eq("user_id", userId)
        .maybeSingle();
      String(emergencyInfo?.allergies_text || "")
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => allergies.push(item));
    } catch {
      // Same as above: no speculative allergy inference.
    }

    return allergies;
  }

  private async storePrescriptionImage(userId: string, imageBase64: string, mediaType: string) {
    const extension = mediaType.includes("png") ? "png" : "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    const { error } = await this.supabase.client.storage
      .from("prescription-images")
      .upload(path, Buffer.from(imageBase64, "base64"), { contentType: mediaType });
    if (error) throw error;
    return path;
  }
}

function isMissingMedicationSchemaError(error: any) {
  return error?.code === "PGRST204" && typeof error?.message === "string" && /'(conversation_ref|duration|medication_explanation|prescription_image_url)' column/.test(error.message);
}
