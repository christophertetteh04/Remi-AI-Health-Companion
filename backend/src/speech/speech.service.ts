import { Injectable } from "@nestjs/common";

// Uses OpenAI's Whisper API for speech-to-text. Swap for Google
// Speech-to-Text if you'd rather keep everything on one cloud
// provider — the shape of transcribe() below is what the mobile app
// expects either way.
@Injectable()
export class SpeechService {
  async transcribe(audioBase64: string): Promise<{ text: string; error?: string }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { text: "", error: "Speech-to-text isn't configured yet — add OPENAI_API_KEY to use voice input." };
    }

    try {
      const audioBuffer = Buffer.from(audioBase64, "base64");
      const formData = new FormData();
      formData.append("file", new Blob([audioBuffer], { type: "audio/m4a" }), "checkin.m4a");
      formData.append("model", "whisper-1");

      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData as any,
      });

      if (!res.ok) {
        return { text: "", error: `Transcription failed (${res.status})` };
      }
      const data = await res.json();
      return { text: data.text || "" };
    } catch (e) {
      return { text: "", error: "Couldn't process that recording — please try again or type instead." };
    }
  }
}
