import { Inject, Injectable, Optional } from "@nestjs/common";
import { AI_PROVIDER, AiProvider } from "../ai-provider/ai-provider.interface";
import { SupabaseService } from "../common/supabase.service";
import { EncryptionService } from "../common/encryption.service";
import { randomUUID } from "crypto";

// Reference-chart-based description only — never diagnosis. The
// danger-sign list is drafted per planning notes and still needs
// clinical advisor sign-off before this ships to real users (see
// AI-BUILD-PROMPTS.md #3 and the flow doc action items).
const SYSTEM_PROMPT = `
You describe urine sample photos by comparing them to a standard
urine color/hydration chart. You must NOT diagnose anything.
Describe only what's visible against the reference (e.g. "this shade
is similar to a well-hydrated urine color").

CRITICAL: if the image shows anything that could be blood (red, pink,
or cola-colored urine), you MUST set dangerSignDetected to true
regardless of anything else — this overrides normal reference-chart
description.

Respond ONLY with strict JSON, no other text:
{
  "description": string,
  "dangerSignDetected": boolean,
  "dangerSignNote": string | null
}
`;

@Injectable()
export class SamplePhotosService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
    @Optional()
    @Inject(AI_PROVIDER)
    private readonly aiProvider?: AiProvider,
  ) {}

  async analyze(userId: string, imageBase64: string, sampleType: "urine", metadata?: { source?: string; conversationRef?: string }) {
    const response = await this.aiProvider!.generateJSONFromImage({
      systemPrompt: SYSTEM_PROMPT,
      prompt: `This is a ${sampleType} sample photo. Please describe it.`,
      imageBase64,
      mediaType: "image/jpeg",
    });

    const text = response.raw || "{}";
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
