import { Injectable } from "@nestjs/common";
import * as Sentry from "@sentry/node";
import { SupabaseService } from "../common/supabase.service";
import { AiProvider } from "./ai-provider.interface";
import { AnthropicProviderService } from "./anthropic-provider.service";
import { DeepSeekProviderService } from "./deepseek-provider.service";
import { GeminiProviderService } from "./gemini-provider.service";
import { KimiProviderService } from "./kimi-provider.service";
import { OpenAiProviderService } from "./openai-provider.service";

type ProviderName = "gemini" | "anthropic" | "openai" | "deepseek" | "kimi";
type ChainKind = "text" | "vision" | "safety-critical";
type ProviderEntry = {
  name: ProviderName;
  service: AiProvider;
  supportsVision: boolean;
  isConfigured: () => boolean;
};

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 5 * 60 * 1000;

@Injectable()
export class AiProviderRouterService implements AiProvider {
  private readonly circuits = new Map<ProviderName, { failures: number; openUntil: number; lastError?: string }>();

  constructor(
    private readonly gemini: GeminiProviderService,
    private readonly anthropic: AnthropicProviderService,
    private readonly openai: OpenAiProviderService,
    private readonly deepseek: DeepSeekProviderService,
    private readonly kimi: KimiProviderService,
    private readonly supabase: SupabaseService,
  ) {}

  async generateJSON(params: { systemPrompt: string; messages: { role: "user" | "assistant"; content: string }[] }): Promise<{ raw: string }> {
    const kind: ChainKind = isSafetyCriticalTextPrompt(params.systemPrompt) ? "safety-critical" : "text";
    return this.callChain(kind, false, (provider) => provider.generateJSON(params));
  }

  async generateJSONFromImage(params: { systemPrompt: string; prompt: string; imageBase64: string; mediaType: string }): Promise<{ raw: string }> {
    const kind: ChainKind = isSafetyCriticalImagePrompt(params.systemPrompt) ? "safety-critical" : "vision";
    return this.callChain(kind, true, (provider) => provider.generateJSONFromImage(params));
  }

  getProviderHealth() {
    const now = Date.now();
    return this.allProviders().map((provider) => {
      const circuit = this.circuits.get(provider.name);
      const configured = provider.isConfigured();
      const circuitOpen = Boolean(circuit?.openUntil && circuit.openUntil > now);
      return {
        provider: provider.name,
        configured,
        supportsVision: provider.supportsVision,
        status: !configured ? "down" : circuitOpen ? "circuit-open" : circuit?.failures ? "down" : "up",
        consecutiveFailures: circuit?.failures || 0,
        circuitOpenUntil: circuitOpen ? new Date(circuit!.openUntil).toISOString() : null,
        lastError: circuit?.lastError || null,
      };
    });
  }

  private async callChain(kind: ChainKind, requiresVision: boolean, call: (provider: AiProvider) => Promise<{ raw: string }>) {
    const providers = this.providersFor(kind, requiresVision);
    const attempted: ProviderName[] = [];
    let lastError: unknown;

    for (const entry of providers) {
      if (this.isCircuitOpen(entry.name)) continue;
      attempted.push(entry.name);
      try {
        const result = await call(entry.service);
        this.markSuccess(entry.name);
        return result;
      } catch (error) {
        lastError = error;
        this.markFailure(entry.name, error);
        const nextProvider = providers.find((candidate) => candidate.name !== entry.name && !this.isCircuitOpen(candidate.name));
        if (nextProvider) await this.logFailover(entry.name, kind, error);
      }
    }

    if (kind === "safety-critical") {
      return safetyCriticalFallbackRaw(providers.map((provider) => provider.name), attempted);
    }
    throw new Error(`All configured AI providers failed for ${kind}: ${safeErrorMessage(lastError)}`);
  }

  private providersFor(kind: ChainKind, requiresVision: boolean) {
    // Safety-critical chains are intentionally separate and usually
    // shorter than the general text/vision chains. Automatic failover
    // skips the human verification step that normally happens when
    // switching models, so do not merge AI_PROVIDER_PRIORITY_SAFETY_CRITICAL
    // into the general-purpose lists unless those providers have been
    // manually verified against Remi's danger-sign and non-diagnostic
    // instructions.
    const envName = kind === "vision"
      ? "AI_PROVIDER_PRIORITY_VISION"
      : kind === "safety-critical"
        ? "AI_PROVIDER_PRIORITY_SAFETY_CRITICAL"
        : "AI_PROVIDER_PRIORITY_TEXT";
    const fallback = kind === "vision" ? "gemini,anthropic,openai,kimi" : kind === "safety-critical" ? "" : "gemini,anthropic,openai,deepseek,kimi";
    const names = parseProviderList(process.env[envName] || fallback);
    const providers = this.allProviders();
    return names
      .map((name) => providers.find((provider) => provider.name === name))
      .filter((provider): provider is ProviderEntry => Boolean(provider))
      .filter((provider) => provider.isConfigured())
      .filter((provider) => !requiresVision || provider.supportsVision)
      .filter((provider) => kind !== "vision" || provider.supportsVision);
  }

  private allProviders(): ProviderEntry[] {
    return [
      { name: "gemini", service: this.gemini, supportsVision: true, isConfigured: () => Boolean(process.env.GEMINI_API_KEY) },
      { name: "anthropic", service: this.anthropic, supportsVision: true, isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY) },
      { name: "openai", service: this.openai, supportsVision: true, isConfigured: () => Boolean(process.env.OPENAI_API_KEY) },
      { name: "deepseek", service: this.deepseek, supportsVision: false, isConfigured: () => Boolean(process.env.DEEPSEEK_API_KEY) },
      { name: "kimi", service: this.kimi, supportsVision: true, isConfigured: () => Boolean(process.env.KIMI_API_KEY) },
    ];
  }

  private markSuccess(provider: ProviderName) {
    this.circuits.delete(provider);
  }

  private markFailure(provider: ProviderName, error: unknown) {
    const current = this.circuits.get(provider) || { failures: 0, openUntil: 0 };
    const failures = current.failures + 1;
    this.circuits.set(provider, {
      failures,
      openUntil: failures >= CIRCUIT_FAILURE_THRESHOLD ? Date.now() + CIRCUIT_OPEN_MS : current.openUntil,
      lastError: safeErrorMessage(error),
    });
  }

  private isCircuitOpen(provider: ProviderName) {
    const circuit = this.circuits.get(provider);
    return Boolean(circuit?.openUntil && circuit.openUntil > Date.now());
  }

  private async logFailover(providerName: ProviderName, serviceName: ChainKind, error: unknown) {
    const errorMessage = safeErrorMessage(error);
    Sentry.captureMessage("AI provider failover", {
      level: "warning",
      extra: { providerName, serviceName, errorMessage },
    });
    try {
      await this.supabase.client
        .from("provider_incidents")
        .insert({ provider_name: providerName, service_name: serviceName, error_message: errorMessage });
    } catch {
      // Provider failover should not fail the user request just because
      // incident persistence is temporarily unavailable.
    }
  }
}

function parseProviderList(value: string): ProviderName[] {
  const allowed: ProviderName[] = ["gemini", "anthropic", "openai", "deepseek", "kimi"];
  return value.split(",").map((name) => name.trim().toLowerCase()).filter((name): name is ProviderName => allowed.includes(name as ProviderName));
}

function isSafetyCriticalTextPrompt(systemPrompt: string) {
  return systemPrompt.includes("You are Remi, a daily health companion") || systemPrompt.includes("crisisDetected");
}

function isSafetyCriticalImagePrompt(systemPrompt: string) {
  return systemPrompt.includes("dangerSignDetected") || systemPrompt.includes("CRITICAL: if the image shows anything that could be blood");
}

function safetyCriticalFallbackRaw(configuredProviders: ProviderName[], attempted: ProviderName[]) {
  const message = "We're having trouble analyzing this right now. If anything about this feels urgent, please contact a doctor or call 112.";
  if (attempted.length === 0 && configuredProviders.length === 0) {
    return { raw: JSON.stringify({ reply: message, urgency: "urgent", description: message, dangerSignDetected: true, dangerSignNote: message }) };
  }
  return { raw: JSON.stringify({ reply: message, urgency: "urgent", description: message, dangerSignDetected: true, dangerSignNote: message }) };
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 300);
  return String(error).slice(0, 300);
}
