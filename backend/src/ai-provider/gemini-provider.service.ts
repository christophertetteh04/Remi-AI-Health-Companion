import { Injectable } from "@nestjs/common";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AiProvider } from "./ai-provider.interface";

const DEFAULT_TEXT_MODEL = "gemini-flash-latest";
const TEXT_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.6-flash"];
const DEFAULT_IMAGE_MODEL = "gemini-3.6-flash";

@Injectable()
export class GeminiProviderService implements AiProvider {
  private gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  async generateJSON(params: {
    systemPrompt: string;
    messages: { role: "user" | "assistant"; content: string }[];
  }): Promise<{ raw: string }> {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
    const contents = params.messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));
    const response = await this.generateTextWithAvailableModel(params.systemPrompt, contents);
    return { raw: response.response.text() || "{}" };
  }

  async generateJSONFromImage(params: {
    systemPrompt: string;
    prompt: string;
    imageBase64: string;
    mediaType: string;
  }): Promise<{ raw: string }> {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured.");
    const model = this.gemini.getGenerativeModel({
      model: process.env.GEMINI_IMAGE_MODEL || process.env.GEMINI_MODEL || DEFAULT_IMAGE_MODEL,
      systemInstruction: params.systemPrompt,
      generationConfig: { maxOutputTokens: 800, responseMimeType: "application/json" },
    });
    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: params.mediaType, data: params.imageBase64 } },
            { text: params.prompt },
          ],
        },
      ],
    });
    return { raw: response.response.text() || "{}" };
  }

  private async generateTextWithAvailableModel(systemPrompt: string, contents: { role: string; parts: { text: string }[] }[]) {
    const configured = process.env.GEMINI_CHECKINS_MODEL || process.env.GEMINI_MODEL || DEFAULT_TEXT_MODEL;
    const candidates = [...new Set([configured, ...TEXT_MODEL_FALLBACKS])];
    let lastError: unknown;

    for (const modelName of candidates) {
      try {
        const model = this.gemini.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
          generationConfig: { maxOutputTokens: 650, responseMimeType: "application/json" },
        });
        return await model.generateContent({ contents });
      } catch (error) {
        lastError = error;
        if (!isMissingGeminiModelError(error)) throw error;
      }
    }

    throw lastError;
  }
}

function isMissingGeminiModelError(error: unknown) {
  const message = safeErrorMessage(error).toLowerCase();
  return message.includes("404") && (message.includes("not found") || message.includes("not supported")) && message.includes("model");
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 180);
  return String(error).slice(0, 180);
}
