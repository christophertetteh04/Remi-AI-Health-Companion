import { Injectable } from "@nestjs/common";
import { AiProvider } from "./ai-provider.interface";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_TEXT_MODEL = "claude-3-5-haiku-latest";
const DEFAULT_VISION_MODEL = "claude-3-5-sonnet-latest";

@Injectable()
export class AnthropicProviderService implements AiProvider {
  async generateJSON(params: { systemPrompt: string; messages: { role: "user" | "assistant"; content: string }[] }): Promise<{ raw: string }> {
    const body = {
      model: process.env.ANTHROPIC_TEXT_MODEL || process.env.ANTHROPIC_MODEL || DEFAULT_TEXT_MODEL,
      max_tokens: 800,
      system: params.systemPrompt,
      messages: params.messages.map((message) => ({ role: message.role, content: message.content })),
    };
    return { raw: await postAnthropic(body) };
  }

  async generateJSONFromImage(params: { systemPrompt: string; prompt: string; imageBase64: string; mediaType: string }): Promise<{ raw: string }> {
    const body = {
      model: process.env.ANTHROPIC_VISION_MODEL || process.env.ANTHROPIC_MODEL || DEFAULT_VISION_MODEL,
      max_tokens: 800,
      system: params.systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: params.mediaType, data: params.imageBase64 } },
            { type: "text", text: params.prompt },
          ],
        },
      ],
    };
    return { raw: await postAnthropic(body) };
  }
}

async function postAnthropic(body: Record<string, any>) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  const response = await fetchWithTimeout(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Anthropic request failed with ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return (data.content || []).map((part: any) => part.text || "").join("") || "{}";
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
