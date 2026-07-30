import { Injectable } from "@nestjs/common";
import { AiProviderRouterService } from "../ai-provider/ai-provider-router.service";
import { SupabaseService } from "../common/supabase.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly aiProviderRouter: AiProviderRouterService,
  ) {}

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

  async getOverview() {
    await this.logAccess("overview", "read");
    const since24h = isoHoursAgo(24);
    const since7d = isoDaysAgo(7);

    const [
      totalUsers,
      newUsers7d,
      urgentSymptoms7d,
      urgentVitals7d,
      medicationLogs24h,
      providerIncidents24h,
      accessLogs24h,
      recentActivities7d,
    ] = await Promise.all([
      this.countRows("users"),
      this.countRows("users", (query) => query.gte("created_at", since7d)),
      this.countRows("symptom_episodes", (query) => query.eq("urgency", "urgent").gte("created_at", since7d)),
      this.countRows("vitals_readings", (query) => query.eq("tier", "urgent").gte("created_at", since7d)),
      this.countRows("medication_logs", (query) => query.gte("created_at", since24h)),
      this.countRows("provider_incidents", (query) => query.gte("occurred_at", since24h)),
      this.countRows("access_logs", (query) => query.gte("created_at", since24h)),
      this.countRows("recent_activities", (query) => query.gte("created_at", since7d)),
    ]);

    return {
      totalUsers,
      newUsers7d,
      urgentCases7d: urgentSymptoms7d + urgentVitals7d,
      medicationLogs24h,
      providerIncidents24h,
      accessLogs24h,
      recentActivities7d,
      generatedAt: new Date().toISOString(),
    };
  }

  async getActivitySummary() {
    await this.logAccess("activity_summary", "read");
    const since7d = isoDaysAgo(7);
    const definitions = [
      { key: "chat", label: "Chat messages", table: "chat_messages", dateColumn: "created_at" },
      { key: "recent", label: "Recent activities", table: "recent_activities", dateColumn: "created_at" },
      { key: "medications", label: "Medications", table: "medications", dateColumn: "created_at" },
      { key: "medicationLogs", label: "Medication logs", table: "medication_logs", dateColumn: "created_at" },
      { key: "vitals", label: "Vitals readings", table: "vitals_readings", dateColumn: "created_at" },
      { key: "labs", label: "Lab reports", table: "lab_reports", dateColumn: "created_at" },
      { key: "imaging", label: "Imaging records", table: "imaging_records", dateColumn: "created_at" },
      { key: "samples", label: "Sample photos", table: "sample_photos", dateColumn: "created_at" },
      { key: "conditions", label: "Tracked conditions", table: "tracked_conditions", dateColumn: "created_at" },
      { key: "cycle", label: "Cycle entries", table: "cycle_entries", dateColumn: "created_at" },
      { key: "lifestyle", label: "Lifestyle entries", table: "lifestyle_entries", dateColumn: "created_at" },
      { key: "documents", label: "Medical documents", table: "medical_documents", dateColumn: "created_at" },
    ];

    const rows = await Promise.all(
      definitions.map(async (item) => {
        const [total, last7d] = await Promise.all([
          this.countRows(item.table),
          this.countRows(item.table, (query) => query.gte(item.dateColumn, since7d)),
        ]);
        return { ...item, total, last7d };
      }),
    );

    return rows;
  }

  async getSystemHealth() {
    await this.logAccess("system_health", "read");
    return {
      environment: process.env.NODE_ENV || "development",
      generatedAt: new Date().toISOString(),
      config: [
        configStatus("Supabase URL", "SUPABASE_URL"),
        configStatus("Supabase service role", "SUPABASE_SERVICE_ROLE_KEY"),
        configStatus("Admin API key", "ADMIN_API_KEY"),
        configStatus("Sentry DSN", "SENTRY_DSN"),
        configStatus("Gemini API key", "GEMINI_API_KEY"),
        configStatus("Anthropic API key", "ANTHROPIC_API_KEY"),
        configStatus("OpenAI API key", "OPENAI_API_KEY"),
        configStatus("DeepSeek API key", "DEEPSEEK_API_KEY"),
        configStatus("Kimi API key", "KIMI_API_KEY"),
      ],
      providerPriority: {
        text: splitPriority(process.env.AI_PROVIDER_PRIORITY_TEXT),
        vision: splitPriority(process.env.AI_PROVIDER_PRIORITY_VISION),
        safetyCritical: splitPriority(process.env.AI_PROVIDER_PRIORITY_SAFETY_CRITICAL),
      },
      providers: this.aiProviderRouter.getProviderHealth(),
    };
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

  async listProviderIncidents() {
    await this.logAccess("provider_incidents", "list");
    const { data, error } = await this.supabase.client
      .from("provider_incidents")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(20);
    if (isMissingTableError(error)) {
      return {
        providers: this.aiProviderRouter.getProviderHealth(),
        incidents: [],
        warning: "provider_incidents table has not been created yet.",
      };
    }
    if (error) throw error;
    return {
      providers: this.aiProviderRouter.getProviderHealth(),
      incidents: data || [],
    };
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

  private async countRows(table: string, apply?: (query: any) => any) {
    let query = this.supabase.client.from(table as any).select("*", { count: "exact", head: true });
    if (apply) query = apply(query);
    const { count, error } = await query;
    if (isMissingTableError(error)) return 0;
    if (error) throw error;
    return count || 0;
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

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function splitPriority(value?: string) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function configStatus(label: string, key: string) {
  const value = process.env[key];
  return {
    label,
    key,
    configured: Boolean(value && !value.startsWith("your-")),
  };
}

function isMissingTableError(error: any) {
  return error?.code === "PGRST205" || /Could not find the table/i.test(String(error?.message || ""));
}
