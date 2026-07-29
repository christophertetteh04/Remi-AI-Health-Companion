import { Injectable, NotFoundException, Optional } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SupabaseService } from "../common/supabase.service";
import { EncryptionService } from "../common/encryption.service";
import { PosthogService } from "../common/posthog.service";

const SYSTEM_PROMPT = `
You read lab report images and explain them in plain language for
someone with no medical background. You must NOT diagnose or name a
likely condition — only explain what each test generally measures and
whether the reported value is described as in-range or out-of-range
on the document itself. Always end by recommending the user discuss
results with their doctor.

Respond ONLY with strict JSON in this shape, no other text:
{
  "testType": string,       // e.g. "Complete Blood Count", "Lipid Panel"
  "explanation": string,    // plain-language summary, 3-5 sentences
  "keyResults": [ { "name": string, "value": string, "flag": "normal" | "out_of_range" | "unclear" } ]
}
`;

const GEMINI_MODEL = "gemini-3.6-flash";

@Injectable()
export class LabsService {
  private gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
    @Optional()
    private readonly posthog?: PosthogService,
  ) {}

  async listForUser(userId: string) {
    const { data, error } = await this.supabase.client
      .from("lab_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    // Decrypt the sensitive summary field on the way out.
    return (data || []).map((row) => ({
      ...row,
      extracted_summary: this.encryption.decrypt(row.extracted_summary),
    }));
  }

  async getForUser(userId: string, id: string) {
    const { data, error } = await this.supabase.client
      .from("lab_reports")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException("Lab report not found");
    return {
      ...data,
      extracted_summary: this.encryption.decrypt(data.extracted_summary),
    };
  }

  async interpretAndCompare(userId: string, imageBase64: string, mediaType: string, analyticsEnabled = true, metadata?: { source?: string; conversationRef?: string }) {
    const model = this.gemini.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { maxOutputTokens: 800, responseMimeType: "application/json" },
    });
    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: mediaType, data: imageBase64 } },
            { text: "Please explain this lab report." },
          ],
        },
      ],
    });

    const text = response.response.text() || "{}";
    let parsed: { testType: string; explanation: string; keyResults: { name: string; value: string; flag: string }[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { testType: "Unknown", explanation: "We couldn't read this report clearly — please try a clearer photo.", keyResults: [] };
    }

    // Multi-document comparison: find the user's most recent PRIOR
    // report of the same test type and describe the change, without
    // interpreting clinical significance.
    const { data: prior } = await this.supabase.client
      .from("lab_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("test_type", parsed.testType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let comparison: string | null = null;
    if (prior) {
      comparison = `You have a previous ${parsed.testType} report on file from ${new Date(prior.created_at).toLocaleDateString()}. Ask your doctor whether the change between that result and this one is significant.`;
    }

    const { data: saved } = await this.supabase.client
      .from("lab_reports")
      .insert({
        user_id: userId,
        test_type: parsed.testType,
        extracted_summary: this.encryption.encrypt(parsed.explanation),
        source: metadata?.source || "direct_upload",
        conversation_ref: metadata?.conversationRef || null,
      })
      .select()
      .single();

    this.posthog?.capture(userId, "lab_report_uploaded", undefined, analyticsEnabled);
    return { ...parsed, comparison, savedId: saved?.id };
  }
}
