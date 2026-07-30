import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";
import { PosthogService } from "../common/posthog.service";

type VitalsInput = { systolic: number; diastolic: number; glucose?: number; wellbeing?: number; pregnancyMode?: boolean };

// Reference ranges are safety-oriented app guidance, not diagnosis.
// Pregnancy mode intentionally escalates high BP earlier because
// concerning readings in pregnancy should be reviewed promptly.
@Injectable()
export class VitalsService {
  constructor(
    private readonly supabase: SupabaseService,
    @Optional()
    private readonly posthog?: PosthogService,
  ) {}

  async listForUser(userId: string) {
    const { data, error } = await this.supabase.client
      .from("vitals_readings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data || [];
  }

  async getForUser(userId: string, id: string) {
    const { data, error } = await this.supabase.client
      .from("vitals_readings")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("Vitals reading not found");
    return data;
  }

  async evaluate(userId: string, reading: VitalsInput, analyticsEnabled = true) {
    const evaluation = evaluateReading(reading);
    const { data, error } = await this.insertReading(userId, reading, evaluation.tier);
    if (error) throw error;

    this.posthog?.capture(userId, "vitals_logged", { tier: evaluation.tier }, analyticsEnabled);
    return { ...evaluation, reading: data };
  }

  async update(userId: string, id: string, reading: VitalsInput) {
    await this.getForUser(userId, id);
    const evaluation = evaluateReading(reading);
    const base = baseReadingRow(reading, evaluation.tier);
    const extended = extendedReadingRow(reading, evaluation.tier);
    let response = await this.supabase.client
      .from("vitals_readings")
      .update(extended)
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (isMissingColumnError(response.error)) {
      response = await this.supabase.client
        .from("vitals_readings")
        .update(base)
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();
    }
    const { data, error } = response;
    if (error) throw error;
    return { ...evaluation, reading: data };
  }

  async remove(userId: string, id: string) {
    await this.getForUser(userId, id);
    const { error } = await this.supabase.client
      .from("vitals_readings")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    return { deleted: true };
  }

  private async insertReading(userId: string, reading: VitalsInput, tier: "normal" | "monitor" | "urgent") {
    const extended = { user_id: userId, ...extendedReadingRow(reading, tier) };
    const base = { user_id: userId, ...baseReadingRow(reading, tier) };
    let response = await this.supabase.client
      .from("vitals_readings")
      .insert(extended)
      .select("*")
      .single();
    if (isMissingColumnError(response.error)) {
      response = await this.supabase.client
        .from("vitals_readings")
        .insert(base)
        .select("*")
        .single();
    }
    return response;
  }
}

function evaluateReading(reading: VitalsInput) {
  let tier: "normal" | "monitor" | "urgent" = "normal";
  const notes: string[] = [];
  const pregnancyMode = Boolean(reading.pregnancyMode);

  if (pregnancyMode) {
    if (reading.systolic >= 160 || reading.diastolic >= 110) {
      tier = maxTier(tier, "urgent");
      notes.push("Blood pressure is in an urgent range for pregnancy-specific tracking. Please seek care now.");
    } else if (reading.systolic >= 140 || reading.diastolic >= 90) {
      tier = maxTier(tier, "urgent");
      notes.push("Blood pressure is high in pregnancy-specific tracking. Please contact maternity care or urgent care now.");
    } else if (reading.systolic >= 130 || reading.diastolic >= 80) {
      tier = maxTier(tier, "monitor");
      notes.push("Blood pressure is a little above the usual pregnancy reference range. Please discuss it with your doctor soon.");
    }
  } else {
    if (reading.systolic >= 180 || reading.diastolic >= 120) {
      tier = maxTier(tier, "urgent");
      notes.push("Blood pressure is in a severely high range. Please seek urgent care now.");
    } else if (reading.systolic >= 160 || reading.diastolic >= 110) {
      tier = maxTier(tier, "urgent");
      notes.push("Blood pressure is significantly high. Please seek care now.");
    } else if (reading.systolic >= 140 || reading.diastolic >= 90) {
      tier = maxTier(tier, "monitor");
      notes.push("Blood pressure is outside the typical range. Please discuss it with your doctor soon.");
    } else if (reading.systolic >= 130 || reading.diastolic >= 80) {
      tier = maxTier(tier, "normal");
      notes.push("Blood pressure is mildly above the usual reference range. Keep tracking it.");
    }
  }

  if (typeof reading.glucose === "number") {
    if (reading.glucose < 54 || reading.glucose >= 300) {
      tier = maxTier(tier, "urgent");
      notes.push("Blood sugar is in an urgent range. Please seek care now.");
    } else if (reading.glucose < 70 || reading.glucose >= 200) {
      tier = maxTier(tier, "monitor");
      notes.push("Blood sugar is outside the usual reference range. Please check with your doctor soon.");
    } else if (reading.glucose >= 140) {
      tier = maxTier(tier, "normal");
      notes.push("Blood sugar is mildly elevated depending on when you last ate. Keep tracking the pattern.");
    }
  }

  if (typeof reading.wellbeing === "number" && reading.wellbeing <= 2) {
    tier = maxTier(tier, "monitor");
    notes.push("Your wellbeing rating is low today. If this continues or feels worrying, please talk with a doctor soon.");
  }

  const message = notes.length
    ? notes.join(" ")
    : pregnancyMode
      ? "This reading is within the pregnancy-specific reference range used by Remi."
      : "This is within the standard adult reference range used by Remi.";

  return {
    tier,
    message,
    referenceMode: pregnancyMode ? "pregnancy" : "standard",
  };
}

function baseReadingRow(reading: VitalsInput, tier: "normal" | "monitor" | "urgent") {
  return {
    systolic: reading.systolic,
    diastolic: reading.diastolic,
    glucose: reading.glucose ?? null,
    tier,
  };
}

function extendedReadingRow(reading: VitalsInput, tier: "normal" | "monitor" | "urgent") {
  return {
    ...baseReadingRow(reading, tier),
    wellbeing: reading.wellbeing ?? null,
    pregnancy_mode: Boolean(reading.pregnancyMode),
  };
}

function maxTier(current: "normal" | "monitor" | "urgent", next: "normal" | "monitor" | "urgent") {
  const rank = { normal: 0, monitor: 1, urgent: 2 };
  return rank[next] > rank[current] ? next : current;
}

function isMissingColumnError(error: any) {
  return error?.code === "PGRST204" || /Could not find.*column|schema cache/i.test(String(error?.message || ""));
}
