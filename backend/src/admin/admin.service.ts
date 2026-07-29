import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async listUsers() {
    await this.logAccess("users", "list");
    const { data, error } = await this.supabase.client
      .from("users")
      .select("id, full_name, phone, language, created_at");
    if (error) throw error;
    return (data || []).map((user) => ({
      id: user.id,
      displayName: initialsFromName(user.full_name),
      phone: maskPhone(user.phone),
      language: user.language || "Not set",
      created_at: user.created_at,
    }));
  }

  async listFlagged() {
    await this.logAccess("flagged_cases", "list");
    const { data: episodes } = await this.supabase.client
      .from("symptom_episodes")
      .select("*")
      .eq("urgency", "urgent")
      .order("created_at", { ascending: false });
    const { data: vitals } = await this.supabase.client
      .from("vitals_readings")
      .select("*")
      .eq("tier", "urgent")
      .order("created_at", { ascending: false });
    return {
      symptomEpisodes: (episodes || []).map((episode) => ({
        id: episode.id,
        type: "symptom_episode",
        urgency: episode.urgency,
        doctorRecommended: Boolean(episode.doctor_recommended),
        created_at: episode.created_at,
      })),
      vitalsReadings: (vitals || []).map((reading) => ({
        id: reading.id,
        type: "vitals_reading",
        tier: reading.tier,
        created_at: reading.created_at,
      })),
    };
  }

  async listAccessLogs() {
    const { data, error } = await this.supabase.client
      .from("access_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data;
  }

  // Every admin read of user health data gets logged — even reads by
  // the sole developer/admin — per the access-logging decision in the
  // flow doc (section 26).
  private async logAccess(resource: string, action: string) {
    await this.supabase.client.from("access_logs").insert({
      resource,
      action,
      actor: "admin",
    });
  }
}

function initialsFromName(name?: string | null) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "Anonymous user";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function maskPhone(phone?: string | null) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "Hidden";
  return `•••• ${digits.slice(-4)}`;
}
