import { Injectable } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SupabaseService } from "../common/supabase.service";
import { EncryptionService } from "../common/encryption.service";
import { randomUUID } from "crypto";

// Reference-chart-based description only — never diagnosis. The
// danger-sign list is drafted per planning notes and still needs
// clinical advisor sign-off before this ships to real users (see
// AI-BUILD-PROMPTS.md #3 and the flow doc action items).
const SYSTEM_PROMPT = `
You describe urine or stool sample photos by comparing them to two
standard reference charts: a urine color/hydration chart, and the
Bristol Stool Chart. You must NOT diagnose anything. Describe only
what's visible against the reference (e.g. "this shade is similar to
a well-hydrated urine color" or "this resembles Type 4 on the Bristol
Stool Chart"). 

CRITICAL: if the image shows anything that could be blood (red, pink,
or cola-colored urine; bright red or black/tarry-looking stool), you
MUST set dangerSignDetected to true regardless of anything else —
this overrides normal reference-chart description.

Respond ONLY with strict JSON, no other text:
{
  "description": string,
  "dangerSignDetected": boolean,
  "dangerSignNote": string | null
}
`;

const GEMINI_MODEL = "gemini-3.6-flash";

@Injectable()
export class SamplePhotosService {
  private gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async analyze(userId: string, imageBase64: string, sampleType: "urine" | "stool", metadata?: { source?: string; conversationRef?: string }) {
    const model = this.gemini.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { maxOutputTokens: 400, responseMimeType: "application/json" },
    });
    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
            { text: `This is a ${sampleType} sample photo. Please describe it.` },
          ],
        },
      ],
    });

    const text = response.response.text() || "{}";
    let parsed: { description: string; dangerSignDetected: boolean; dangerSignNote: string | null };
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { description: "We couldn't read that photo clearly — please try again with better lighting.", dangerSignDetected: false, dangerSignNote: null };
    }

    const fileName = `${userId}/${randomUUID()}.jpg`;
    await this.supabase.client.storage
      .from("sample-photos")
      .upload(fileName, Buffer.from(imageBase64, "base64"), { contentType: "image/jpeg" });

    const { data: saved } = await this.supabase.client
      .from("sample_photos")
      .insert({
        user_id: userId,
        sample_type: sampleType,
        photo_path: fileName,
        description: this.encryption.encrypt(parsed.description),
        danger_sign_detected: parsed.dangerSignDetected,
        source: metadata?.source || "direct_upload",
        conversation_ref: metadata?.conversationRef || null,
      })
      .select()
      .single();

    // Danger sign overrides everything — this is the urgent-tier
    // escalation exception described in planning, using the same
    // tier system as vitals.
    return {
      id: saved?.id,
      description: parsed.description,
      tier: parsed.dangerSignDetected ? "urgent" : "normal",
      urgentMessage: parsed.dangerSignDetected
        ? "This is a sign that should be checked by a doctor promptly."
        : null,
    };
  }

  async remove(userId: string, id: string) {
    const { data } = await this.supabase.client
      .from("sample_photos")
      .select("photo_path")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (data?.photo_path) {
      await this.supabase.client.storage.from("sample-photos").remove([data.photo_path]);
    }
    await this.supabase.client.from("sample_photos").delete().eq("id", id).eq("user_id", userId);
    return { deleted: true };
  }
}
