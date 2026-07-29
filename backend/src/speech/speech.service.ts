import { Injectable } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-2.5-flash";

@Injectable()
export class SpeechService {
  private gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  async transcribe(audioBase64: string, mimeType = "audio/m4a"): Promise<{ text: string; error?: string }> {
    if (audioBase64.length > 8_000_000) {
      return { text: "", error: "That recording is too long — please try a shorter voice note." };
    }

    if (process.env.GEMINI_API_KEY) {
      const geminiResult = await this.transcribeWithGemini(audioBase64, mimeType);
      if (geminiResult.text || !process.env.OPENAI_API_KEY) return geminiResult;
    }

    if (!process.env.OPENAI_API_KEY) {
      return { text: "", error: "Speech-to-text isn't configured yet — add GEMINI_API_KEY or OPENAI_API_KEY to use voice input." };
    }

    return this.transcribeWithWhisper(audioBase64, mimeType);
  }

  async transcribeBuffer(audioBuffer?: Buffer, mimeType = "audio/m4a"): Promise<{ text: string; error?: string }> {
    if (!audioBuffer?.length) return { text: "", error: "Recording was empty — please try again." };
    if (audioBuffer.length > 6_000_000) {
      return { text: "", error: "That recording is too long — please try a shorter voice note." };
    }
    return this.transcribe(audioBuffer.toString("base64"), mimeType);
  }

  private async transcribeWithGemini(audioBase64: string, mimeType: string): Promise<{ text: string; error?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const model = this.gemini.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: "You transcribe user voice notes for a health chat. Return only the spoken words as plain text. Do not answer the health concern.",
        generationConfig: { maxOutputTokens: 300 },
      });
      const response = await model.generateContent(
        {
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType, data: audioBase64 } },
                { text: "Transcribe this audio exactly. If there is no clear speech, return an empty string." },
              ],
            },
          ],
        },
        { signal: controller.signal } as any,
      );
      return { text: response.response.text().trim() };
    } catch {
      return { text: "", error: "Couldn't process that recording — please try again or type instead." };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async transcribeWithWhisper(audioBase64: string, mimeType: string): Promise<{ text: string; error?: string }> {
    const apiKey = process.env.OPENAI_API_KEY!;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const audioBuffer = Buffer.from(audioBase64, "base64");
      const formData = new FormData();
      formData.append("file", new Blob([audioBuffer], { type: mimeType }), fileNameForMimeType(mimeType));
      formData.append("model", "whisper-1");

      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData as any,
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          return { text: "", error: "Voice transcription is busy right now. Please wait a moment and try again, or type your message instead." };
        }
        return { text: "", error: "Couldn't process that recording — please try again or type instead." };
      }
      const data = await res.json();
      return { text: data.text || "" };
    } catch (e) {
      return { text: "", error: "Couldn't process that recording — please try again or type instead." };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function fileNameForMimeType(mimeType: string) {
  if (mimeType === "audio/wav") return "checkin.wav";
  if (mimeType === "audio/webm") return "checkin.webm";
  if (mimeType === "audio/3gpp") return "checkin.3gp";
  if (mimeType === "audio/aac") return "checkin.aac";
  return "checkin.m4a";
}
