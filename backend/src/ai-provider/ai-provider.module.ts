import { Module } from "@nestjs/common";
import { AI_PROVIDER } from "./ai-provider.interface";
import { SupabaseService } from "../common/supabase.service";
import { AiProviderRouterService } from "./ai-provider-router.service";
import { AnthropicProviderService } from "./anthropic-provider.service";
import { DeepSeekProviderService } from "./deepseek-provider.service";
import { GeminiProviderService } from "./gemini-provider.service";
import { KimiProviderService } from "./kimi-provider.service";
import { OpenAiProviderService } from "./openai-provider.service";

@Module({
  providers: [
    AnthropicProviderService,
    DeepSeekProviderService,
    GeminiProviderService,
    KimiProviderService,
    OpenAiProviderService,
    AiProviderRouterService,
    SupabaseService,
    { provide: AI_PROVIDER, useExisting: AiProviderRouterService },
  ],
  exports: [AI_PROVIDER, AiProviderRouterService],
})
export class AiProviderModule {}
