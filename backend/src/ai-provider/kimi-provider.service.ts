import { Injectable } from "@nestjs/common";
import { AiProvider } from "./ai-provider.interface";

const KIMI_API_URL = "https://api.moonshot.ai/v1/chat/completions";
const DEFAULT_TEXT_MODEL = "kimi-k2-turbo-preview";
const DEFAULT_VISION_MODEL = "kimi-k2.6";

@Injectable()
export class KimiProviderService implements AiProvider {
  async generateJSON(params: { systemPrompt: string; messages: { role: "user" | "assistant"; content: string }[] }): Promise<{ raw: string }> {
    const body = {
      model: process.env.KIMI_TEXT_MODEL || process.env.KIMI_MODEL || DEFAULT_TEXT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.systemPrompt },
        ...params.messages,
      ],
    };
    return { raw: await postKimi(body) };
  }

  async generateJSONFromImage(params: { systemPrompt: string; prompt: string; imageBase64: string; mediaType: string }): Promise<{ raw: string }> {
    const body = {
      model: process.env.KIMI_VISION_MODEL || process.env.KIMI_MODEL || DEFAULT_VISION_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: params.systemPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${params.mediaType};base64,${params.imageBase64}` } },
            { type: "text", text: params.prompt },
          ],
        },
      ],
    };
    return { raw: await postKimi(body) };
  }
}

async function postKimi(body: Record<string, any>) {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) throw new Error("KIMI_API_KEY is not configured.");
  const response = await fetchWithTimeout(KIMI_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Kimi request failed with ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "{}";
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
