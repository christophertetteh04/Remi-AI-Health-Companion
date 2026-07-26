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
    return data;
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
    return { symptomEpisodes: episodes || [], vitalsReadings: vitals || [] };
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
