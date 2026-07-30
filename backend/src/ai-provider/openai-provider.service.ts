import { Injectable } from "@nestjs/common";
import { AiProvider } from "./ai-provider.interface";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const DEFAULT_TEXT_MODEL = "gpt-4.1-mini";
const DEFAULT_VISION_MODEL = "gpt-4.1-mini";

@Injectable()
export class OpenAiProviderService implements AiProvider {
  async generateJSON(params: { systemPrompt: string; messages: { role: "user" | "assistant"; content: string }[] }): Promise<{ raw: string }> {
    const body = {
      model: process.env.OPENAI_TEXT_MODEL || process.env.OPENAI_MODEL || DEFAULT_TEXT_MODEL,
      instructions: params.systemPrompt,
      input: params.messages.map((message) => ({ role: message.role, content: message.content })),
      text: { format: { type: "json_object" } },
    };
    return { raw: await postOpenAi(body) };
  }

  async generateJSONFromImage(params: { systemPrompt: string; prompt: string; imageBase64: string; mediaType: string }): Promise<{ raw: string }> {
    const body = {
      model: process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || DEFAULT_VISION_MODEL,
      instructions: params.systemPrompt,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: params.prompt },
            { type: "input_image", image_url: `data:${params.mediaType};base64,${params.imageBase64}` },
          ],
        },
      ],
      text: { format: { type: "json_object" } },
    };
    return { raw: await postOpenAi(body) };
  }
}

async function postOpenAi(body: Record<string, any>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const response = await fetchWithTimeout(OPENAI_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`OpenAI request failed with ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.output_text || data.output?.flatMap((item: any) => item.content || []).map((part: any) => part.text || "").join("") || "{}";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
