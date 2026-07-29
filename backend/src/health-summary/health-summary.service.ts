import { Injectable } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EncryptionService } from "../common/encryption.service";
import { SupabaseService } from "../common/supabase.service";

type TimelineEvent = {
  id: string;
  type: "symptom" | "lab" | "medication" | "vitals" | "condition" | "lifestyle" | "cycle" | "menopause" | "pain" | "imaging";
  title: string;
  detail: string;
  tier?: "normal" | "monitor" | "urgent";
  created_at: string;
  source: string;
};

const PREP_SYSTEM_PROMPT = `
You create a short doctor-visit preparation summary for a patient.
Stay descriptive and non-diagnostic. Never infer, diagnose, rank
likely causes, or recommend treatment changes.

Use only the logged data provided. Cite what was logged and when in
plain language. Write 3-5 short paragraphs a patient can read aloud
or show to a clinician. End by encouraging the patient to confirm
meaning and next steps with their clinician.
`;

const GEMINI_MODEL = "gemini-3.6-flash";

@Injectable()
export class HealthSummaryService {
  private gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async timeline(userId: string, limit = 30, offset = 0) {
    const events = await this.collectTimelineEvents(userId);
    const sorted = events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    return {
      items: sorted.slice(safeOffset, safeOffset + safeLimit),
      nextOffset: safeOffset + safeLimit < sorted.length ? safeOffset + safeLimit : null,
      total: sorted.length,
    };
  }

  async correlations(userId: string) {
    const [vitals, lifestyle, menopause] = await Promise.all([
      this.select("vitals_readings", userId, "created_at,systolic,diastolic,tier"),
      this.select("lifestyle_entries", userId, "created_at,entry_type,data,note"),
      this.select("menopause_entries", userId, "created_at,mood_note,sleep_disruption,hot_flashes"),
    ]);

    const notes: { title: string; description: string; evidenceCount: number }[] = [];
    const vitalsByDay = new Map<string, any[]>();
    for (const reading of vitals) {
      const day = toDay(reading.created_at);
      vitalsByDay.set(day, [...(vitalsByDay.get(day) || []), reading]);
    }

    const sleepByQuality = { poor: [] as number[], good: [] as number[] };
    for (const entry of lifestyle.filter((row) => row.entry_type === "sleep")) {
      const quality = entry.data?.quality;
      if (quality !== "poor" && quality !== "good") continue;
      for (const reading of vitalsByDay.get(toDay(entry.created_at)) || []) {
        sleepByQuality[quality].push(Number(reading.systolic || 0));
      }
    }
    if (sleepByQuality.poor.length >= 3 && sleepByQuality.good.length >= 3) {
      const poorAvg = average(sleepByQuality.poor);
      const goodAvg = average(sleepByQuality.good);
      if (poorAvg - goodAvg >= 5) {
        notes.push({
          title: "Blood pressure and sleep quality",
          description: `Your systolic BP readings have tended to be higher on days you logged poor sleep than on days you logged good sleep (${Math.round(poorAvg)} vs ${Math.round(goodAvg)} average). This is descriptive only, not a diagnosis or cause.`,
          evidenceCount: sleepByQuality.poor.length + sleepByQuality.good.length,
        });
      }
    }

    const negativeMoodDays = new Set(
      menopause
        .filter((row) => {
          const note = this.encryption.decrypt(row.mood_note || "").toLowerCase();
          return row.sleep_disruption || /\b(low|sad|anxious|stress|stressed|irritable|down|poor)\b/.test(note);
        })
        .map((row) => toDay(row.created_at)),
    );
    const negativeMoodVitals = vitals.filter((row) => negativeMoodDays.has(toDay(row.created_at)));
    const comparisonVitals = vitals.filter((row) => !negativeMoodDays.has(toDay(row.created_at)));
    if (negativeMoodVitals.length >= 3 && comparisonVitals.length >= 3) {
      const negativeRate = rateNotNormal(negativeMoodVitals);
      const comparisonRate = rateNotNormal(comparisonVitals);
      if (negativeRate - comparisonRate >= 0.25) {
        notes.push({
          title: "Vitals and difficult mood/sleep days",
          description: "Vitals have more often landed outside the normal tier on days with negative mood or sleep-disruption check-ins. This is descriptive correlation only and may reflect many factors.",
          evidenceCount: negativeMoodVitals.length + comparisonVitals.length,
        });
      }
    }

    return {
      notes,
      disclaimer: "These notes describe patterns in your logs only. They are not diagnostic and do not show cause.",
    };
  }

  async doctorPrep(userId: string, visitDate?: string, concern?: string) {
    const bundle = await this.collectPrepBundle(userId);
    const fallback = this.fallbackSummary(bundle, visitDate, concern);
    if (!process.env.GEMINI_API_KEY) return { summary: fallback, generatedBy: "local", ...bundle };

    try {
      const model = this.gemini.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: PREP_SYSTEM_PROMPT,
        generationConfig: { maxOutputTokens: 900 },
      });
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: JSON.stringify({ visitDate, concern, ...bundle }) }] }],
      });
      const summary = response.response.text()?.trim() || fallback;
      return { summary, generatedBy: "gemini", ...bundle };
    } catch {
      return { summary: fallback, generatedBy: "local", ...bundle };
    }
  }

  async exportPdf(userId: string, visitDate?: string, concern?: string) {
    const prep = await this.doctorPrep(userId, visitDate, concern);
    const lines = [
      "Remi Health Summary",
      "Non-diagnostic summary for clinician review",
      "",
      ...wrap(prep.summary, 88),
      "",
      "Current medications",
      ...tableLines(["Name", "Dose", "Frequency"], prep.medications.map((med: any) => [med.name || "-", med.dose || "-", med.frequency || "-"])),
      "",
      "Recent vitals",
      ...tableLines(["Date", "BP", "Glucose", "Tier"], prep.vitals.map((vital: any) => [dateLabel(vital.created_at), `${vital.systolic || "-"}/${vital.diastolic || "-"}`, vital.glucose || "-", vital.tier || "-"])),
      "",
      "This export summarizes logged data only and is not a diagnosis.",
    ];
    return buildPdf(lines);
  }

  private async collectTimelineEvents(userId: string): Promise<TimelineEvent[]> {
    const [symptoms, labs, meds, medLogs, vitals, conditions, lifestyle, cycles, menopause, pain, imaging] = await Promise.all([
      this.select("symptom_episodes", userId, "id,description,urgency,doctor_recommended,outcome,body_location,created_at"),
      this.select("lab_reports", userId, "id,test_type,extracted_summary,created_at"),
      this.select("medications", userId, "id,name,dose,frequency,created_at"),
      this.medicationLogs(userId),
      this.select("vitals_readings", userId, "id,systolic,diastolic,glucose,tier,created_at"),
      this.select("tracked_conditions", userId, "id,condition,enabled,created_at"),
      this.select("lifestyle_entries", userId, "id,entry_type,data,note,created_at"),
      this.select("cycle_entries", userId, "id,start_date,flow,symptoms,created_at"),
      this.select("menopause_entries", userId, "id,hot_flashes,mood_note,sleep_disruption,created_at"),
      this.select("pain_crises", userId, "id,severity,trigger_note,location,tier,created_at"),
      this.select("imaging_records", userId, "id,kind,scan_type,explanation,created_at"),
    ]);

    return [
      ...symptoms.map((row) => event(row.id, "symptom", "Symptom episode", this.encryption.decrypt(row.description || "") || row.body_location || "Symptom logged", row.created_at, "symptom_episodes", row.urgency)),
      ...symptoms
        .filter((row) => row.outcome)
        .map((row) => event(`${row.id}-outcome`, "symptom", "Doctor-visit outcome", this.encryption.decrypt(row.outcome || ""), row.created_at, "symptom_episodes", row.urgency)),
      ...labs.map((row) => event(row.id, "lab", row.test_type || "Lab report", this.encryption.decrypt(row.extracted_summary || "") || "Lab report uploaded", row.created_at, "lab_reports")),
      ...meds.map((row) => event(row.id, "medication", "Medication added", `${row.name}${row.dose ? `, ${row.dose}` : ""}${row.frequency ? `, ${row.frequency}` : ""}`, row.created_at, "medications")),
      ...medLogs.map((row) => event(row.id, "medication", "Medication taken", `${row.medicationName || "Medication"} marked taken`, row.created_at, "medication_logs")),
      ...vitals.map((row) => event(row.id, "vitals", "Vitals reading", `BP ${row.systolic || "-"}/${row.diastolic || "-"}${row.glucose ? `, glucose ${row.glucose}` : ""}`, row.created_at, "vitals_readings", row.tier)),
      ...conditions.map((row) => event(row.id, "condition", row.enabled ? "Condition support enabled" : "Condition support changed", labelCondition(row.condition), row.created_at, "tracked_conditions")),
      ...lifestyle.map((row) => event(row.id, "lifestyle", labelLifestyle(row), detailLifestyle(row, this.encryption), row.created_at, "lifestyle_entries")),
      ...cycles.map((row) => event(row.id, "cycle", "Cycle entry", `${row.start_date}, ${row.flow || "flow not set"}${row.symptoms ? `, ${this.encryption.decrypt(row.symptoms)}` : ""}`, row.created_at, "cycle_entries")),
      ...menopause.map((row) => event(row.id, "menopause", "Menopause check-in", `${row.hot_flashes ? "Hot flashes" : "No hot flashes"}${row.sleep_disruption ? ", sleep disruption" : ""}${row.mood_note ? `, ${this.encryption.decrypt(row.mood_note)}` : ""}`, row.created_at, "menopause_entries")),
      ...pain.map((row) => event(row.id, "pain", "Pain crisis", `Severity ${row.severity}/10${row.location ? `, ${row.location}` : ""}${row.trigger_note ? `, ${this.encryption.decrypt(row.trigger_note)}` : ""}`, row.created_at, "pain_crises", row.tier)),
      ...imaging.map((row) => event(row.id, "imaging", row.scan_type || "Imaging record", row.kind === "scan_image" ? "Image saved for clinician review" : this.encryption.decrypt(row.explanation || ""), row.created_at, "imaging_records")),
    ];
  }

  private async collectPrepBundle(userId: string) {
    const [timeline, medications, vitals, labs] = await Promise.all([
      this.timeline(userId, 20, 0),
      this.select("medications", userId, "name,dose,frequency,time_of_day,created_at"),
      this.select("vitals_readings", userId, "systolic,diastolic,glucose,tier,created_at"),
      this.select("lab_reports", userId, "test_type,extracted_summary,created_at"),
    ]);
    return {
      recentEvents: timeline.items.slice(0, 12),
      medications: medications.slice(0, 12),
      vitals: vitals.slice(0, 8),
      labs: labs.slice(0, 6).map((row) => ({ ...row, extracted_summary: this.encryption.decrypt(row.extracted_summary || "") })),
    };
  }

  private fallbackSummary(bundle: any, visitDate?: string, concern?: string) {
    return [
      `This Remi summary is for a${visitDate ? ` visit on ${visitDate}` : " future visit"} and is descriptive only.`,
      concern ? `Main concern noted by the user: ${concern}.` : "No single main concern was entered.",
      `Recent logged events include: ${bundle.recentEvents.slice(0, 5).map((item: TimelineEvent) => `${item.title} on ${dateLabel(item.created_at)}`).join("; ") || "no recent events found"}.`,
      `Current medications logged: ${bundle.medications.map((med: any) => med.name).filter(Boolean).join(", ") || "none listed"}.`,
      "Recent vitals and labs are included below for the clinician to review. Please confirm meaning and next steps with your clinician.",
    ].join("\n\n");
  }

  private async select(table: string, userId: string, columns: string): Promise<any[]> {
    const { data, error } = await this.supabase.client
      .from(table as any)
      .select(columns)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data || []) as any[];
  }

  private async medicationLogs(userId: string): Promise<any[]> {
    const { data: medications, error } = await this.supabase.client
      .from("medications")
      .select("id,name,medication_logs(id,taken_at,created_at)")
      .eq("user_id", userId)
      .limit(60);
    if (error) throw error;
    return ((medications || []) as any[]).flatMap((medication) =>
      (medication.medication_logs || []).map((log: any) => ({
        id: log.id,
        created_at: log.taken_at || log.created_at,
        medicationName: medication.name,
      })),
    );
  }
}

function event(id: string, type: TimelineEvent["type"], title: string, detail: string, created_at: string, source: string, tier?: TimelineEvent["tier"]): TimelineEvent {
  return { id, type, title, detail, created_at, source, tier };
}

function toDay(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function rateNotNormal(values: any[]) {
  return values.filter((row) => row.tier === "monitor" || row.tier === "urgent").length / Math.max(values.length, 1);
}

function dateLabel(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function labelCondition(value: string) {
  return String(value || "").replace(/_/g, " ");
}

function labelLifestyle(row: any) {
  if (row.entry_type === "sleep") return "Sleep logged";
  if (row.entry_type === "activity") return "Activity logged";
  if (row.entry_type === "weight") return "Weight logged";
  return "Lifestyle note";
}

function detailLifestyle(row: any, encryption: EncryptionService) {
  if (row.entry_type === "sleep") return `${row.data?.hours || "-"} hours, ${row.data?.quality || "quality not set"}`;
  if (row.entry_type === "activity") return `${row.data?.activityType || "Activity"}, ${row.data?.minutes || 0} minutes`;
  if (row.entry_type === "weight") return `${row.data?.weightKg || "-"} kg${row.data?.bmi ? `, BMI ${row.data.bmi}` : ""}`;
  return `${row.data?.substance || "Substance use"}${row.note ? `: ${encryption.decrypt(row.note)}` : ""}`;
}

function wrap(text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      if ((line + " " + word).trim().length > width) {
        lines.push(line);
        line = word;
      } else {
        line = (line + " " + word).trim();
      }
    }
    if (line) lines.push(line);
    lines.push("");
  }
  return lines;
}

function tableLines(headers: string[], rows: string[][]) {
  const output = [headers.join(" | "), "-".repeat(72)];
  for (const row of rows.slice(0, 12)) output.push(row.map((cell) => String(cell).slice(0, 24)).join(" | "));
  if (!rows.length) output.push("No entries logged.");
  return output;
}

function buildPdf(lines: string[]) {
  const pageLines = chunk(lines.flatMap((line) => wrap(line, 92)), 42);
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids ${pageLines.map((_, index) => `${3 + index * 2} 0 R`).join(" ")} /Count ${pageLines.length} >>`);
  pageLines.forEach((page, index) => {
    const pageObj = 3 + index * 2;
    const contentObj = pageObj + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObj} 0 R >>`);
    const stream = ["BT", "/F1 10 Tf", "50 750 Td", "14 TL", ...page.map((line) => `(${pdfEscape(line)}) Tj T*`), "ET"].join("\n");
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

function pdfEscape(value: string) {
  return value.replace(/[^\x20-\x7E]/g, "-").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks.length ? chunks : [[]];
}
