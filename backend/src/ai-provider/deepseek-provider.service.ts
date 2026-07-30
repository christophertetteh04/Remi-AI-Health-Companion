import { Injectable } from "@nestjs/common";
import { AiProvider } from "./ai-provider.interface";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEFAULT_TEXT_MODEL = "deepseek-chat";

@Injectable()
export class DeepSeekProviderService implements AiProvider {
  async generateJSON(params: { systemPrompt: string; messages: { role: "user" | "assistant"; content: string }[] }): Promise<{ raw: string }> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured.");
    const response = await fetchWithTimeout(DEEPSEEK_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_TEXT_MODEL || process.env.DEEPSEEK_MODEL || DEFAULT_TEXT_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.systemPrompt },
          ...params.messages,
        ],
      }),
    });
    if (!response.ok) throw new Error(`DeepSeek request failed with ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return { raw: data.choices?.[0]?.message?.content || "{}" };
  }

  async generateJSONFromImage(): Promise<{ raw: string }> {
    throw new Error("DeepSeek image input is not supported by this adapter.");
  }
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
