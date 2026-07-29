import { Injectable } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SupabaseService } from "../common/supabase.service";
import { EncryptionService } from "../common/encryption.service";
import { randomUUID } from "crypto";

const REPORT_SYSTEM_PROMPT = `
You read WRITTEN radiology reports (text, not the scan image itself)
and explain them in plain language for someone with no medical
background. You must NOT diagnose or name a likely condition — only
explain what the report says, in plain terms. Always end by
recommending the user discuss it with their doctor.

Respond ONLY with strict JSON, no other text:
{ "explanation": string }
`;

const GEMINI_MODEL = "gemini-3.6-flash";

@Injectable()
export class ImagingService {
  private gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async listForUser(userId: string) {
    const { data, error } = await this.supabase.client
      .from("imaging_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      explanation: row.explanation ? this.encryption.decrypt(row.explanation) : null,
    }));
  }

  async upload(userId: string, imageBase64: string, kind: "report_text" | "scan_image", scanType: string, metadata?: { source?: string; conversationRef?: string }) {
    const fileName = `${userId}/${randomUUID()}.jpg`;
    await this.supabase.client.storage
      .from("imaging-files")
      .upload(fileName, Buffer.from(imageBase64, "base64"), { contentType: "image/jpeg" });

    if (kind === "scan_image") {
      // Deliberately NO AI call here. Raw scan images (CT/MRI/X-ray/
      // ultrasound) are stored and logged only — interpreting them
      // visually is out of scope, per planning. This is the one
      // upload path in the whole app that skips the AI entirely.
      const { data: saved } = await this.supabase.client
        .from("imaging_records")
        .insert({ user_id: userId, kind, scan_type: scanType, photo_path: fileName, source: metadata?.source || "direct_upload", conversation_ref: metadata?.conversationRef || null })
        .select()
        .single();
      return { id: saved?.id, kind, message: "Saved to your health record. This type of image isn't interpreted by the app — bring it to your doctor for review." };
    }

    // report_text path — same explanation pattern as lab reports.
    const model = this.gemini.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: REPORT_SYSTEM_PROMPT,
      generationConfig: { maxOutputTokens: 600, responseMimeType: "application/json" },
    });
    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
            { text: "Please explain this radiology report." },
          ],
        },
      ],
    });
    const text = response.response.text() || "{}";
    let parsed: { explanation: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { explanation: "We couldn't read this report clearly — please try a clearer photo, or bring it to your doctor directly." };
    }

    const { data: saved } = await this.supabase.client
      .from("imaging_records")
      .insert({
        user_id: userId,
        kind,
        scan_type: scanType,
        photo_path: fileName,
        explanation: this.encryption.encrypt(parsed.explanation),
        source: metadata?.source || "direct_upload",
        conversation_ref: metadata?.conversationRef || null,
      })
      .select()
      .single();

    return { id: saved?.id, kind, explanation: parsed.explanation };
  }
}
