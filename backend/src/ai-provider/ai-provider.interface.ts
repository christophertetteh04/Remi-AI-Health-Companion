export const AI_PROVIDER = "AI_PROVIDER";

export type AiTextMessage = {
  role: "user" | "assistant";
  content: string;
};

export interface AiProvider {
  generateJSON(params: {
    systemPrompt: string;
    messages: AiTextMessage[];
  }): Promise<{ raw: string }>;

  generateJSONFromImage(params: {
    systemPrompt: string;
    prompt: string;
    imageBase64: string;
    mediaType: string;
  }): Promise<{ raw: string }>;
}
