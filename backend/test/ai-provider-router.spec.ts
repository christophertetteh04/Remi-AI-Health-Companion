import { AiProviderRouterService } from "../src/ai-provider/ai-provider-router.service";

const originalEnv = { ...process.env };

describe("AiProviderRouterService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.OPENAI_API_KEY = "test-openai";
    process.env.ANTHROPIC_API_KEY = "test-anthropic";
    process.env.AI_PROVIDER_PRIORITY_TEXT = "openai,anthropic";
    process.env.AI_PROVIDER_PRIORITY_VISION = "openai,anthropic";
    process.env.AI_PROVIDER_PRIORITY_SAFETY_CRITICAL = "openai,anthropic";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("falls through to the second provider when the first provider fails", async () => {
    const openai = provider({ generateJSON: jest.fn().mockRejectedValue(new Error("rate limited")) });
    const anthropic = provider({ generateJSON: jest.fn().mockResolvedValue({ raw: "{\"ok\":true}" }) });
    const insert = jest.fn().mockResolvedValue({ data: null, error: null });
    const router = makeRouter({ openai, anthropic, insert });

    const result = await router.generateJSON({ systemPrompt: "general", messages: [{ role: "user", content: "hello" }] });

    expect(result.raw).toBe("{\"ok\":true}");
    expect(openai.generateJSON).toHaveBeenCalledTimes(1);
    expect(anthropic.generateJSON).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ provider_name: "openai", service_name: "text" }));
  });

  it("opens the circuit and skips a provider after 3 consecutive failures", async () => {
    const openai = provider({ generateJSON: jest.fn().mockRejectedValue(new Error("down")) });
    const anthropic = provider({ generateJSON: jest.fn().mockResolvedValue({ raw: "{\"ok\":true}" }) });
    const router = makeRouter({ openai, anthropic });

    await router.generateJSON({ systemPrompt: "general", messages: [{ role: "user", content: "one" }] });
    await router.generateJSON({ systemPrompt: "general", messages: [{ role: "user", content: "two" }] });
    await router.generateJSON({ systemPrompt: "general", messages: [{ role: "user", content: "three" }] });
    await router.generateJSON({ systemPrompt: "general", messages: [{ role: "user", content: "four" }] });

    expect(openai.generateJSON).toHaveBeenCalledTimes(3);
    expect(anthropic.generateJSON).toHaveBeenCalledTimes(4);
    expect(router.getProviderHealth().find((item) => item.provider === "openai")?.status).toBe("circuit-open");
  });

  it("returns the hardcoded safe response when every safety-critical provider fails", async () => {
    process.env.DEEPSEEK_API_KEY = "test-deepseek";
    process.env.AI_PROVIDER_PRIORITY_TEXT = "deepseek";
    const openai = provider({ generateJSONFromImage: jest.fn().mockRejectedValue(new Error("down")) });
    const anthropic = provider({ generateJSONFromImage: jest.fn().mockRejectedValue(new Error("down too")) });
    const deepseek = provider({ generateJSONFromImage: jest.fn().mockResolvedValue({ raw: "{\"unsafe\":true}" }) });
    const router = makeRouter({ openai, anthropic, deepseek });

    const result = await router.generateJSONFromImage({
      systemPrompt: "Return JSON with dangerSignDetected for sample photos.",
      prompt: "Describe this sample.",
      imageBase64: "abc",
      mediaType: "image/jpeg",
    });

    const parsed = JSON.parse(result.raw);
    expect(parsed.dangerSignDetected).toBe(true);
    expect(parsed.description).toContain("We're having trouble analyzing this right now");
    expect(deepseek.generateJSONFromImage).not.toHaveBeenCalled();
  });

  it("logs failover events to provider_incidents", async () => {
    const openai = provider({ generateJSON: jest.fn().mockRejectedValue(new Error("auth failed")) });
    const anthropic = provider({ generateJSON: jest.fn().mockResolvedValue({ raw: "{\"ok\":true}" }) });
    const insert = jest.fn().mockResolvedValue({ data: null, error: null });
    const router = makeRouter({ openai, anthropic, insert });

    await router.generateJSON({ systemPrompt: "general", messages: [{ role: "user", content: "hello" }] });

    expect(insert).toHaveBeenCalledWith({
      provider_name: "openai",
      service_name: "text",
      error_message: "auth failed",
    });
  });

  it("sends admin alerts when a configured provider goes down", async () => {
    process.env.ADMIN_ALERT_WEBHOOK_URL = "https://alerts.example.com/remi";
    process.env.RESEND_API_KEY = "test-resend";
    process.env.ADMIN_ALERT_EMAIL = "admin@example.com";
    process.env.ADMIN_ALERT_FROM_EMAIL = "Remi Alerts <alerts@example.com>";
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);
    const openai = provider({ generateJSON: jest.fn().mockRejectedValue(new Error("provider unavailable")) });
    const anthropic = provider({ generateJSON: jest.fn().mockResolvedValue({ raw: "{\"ok\":true}" }) });
    const router = makeRouter({ openai, anthropic });

    await router.generateJSON({ systemPrompt: "general", messages: [{ role: "user", content: "hello" }] });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://alerts.example.com/remi",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    fetchMock.mockRestore();
  });
});

function provider(overrides: Partial<any> = {}) {
  return {
    generateJSON: jest.fn().mockResolvedValue({ raw: "{}" }),
    generateJSONFromImage: jest.fn().mockResolvedValue({ raw: "{}" }),
    ...overrides,
  };
}

function makeRouter({
  gemini = provider(),
  anthropic = provider(),
  openai = provider(),
  deepseek = provider(),
  kimi = provider(),
  insert = jest.fn().mockResolvedValue({ data: null, error: null }),
}: Partial<Record<"gemini" | "anthropic" | "openai" | "deepseek" | "kimi", any>> & { insert?: jest.Mock } = {}) {
  const supabase = { client: { from: jest.fn(() => ({ insert })) } };
  return new AiProviderRouterService(gemini, anthropic, openai, deepseek, kimi, supabase as any);
}
