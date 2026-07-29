import { SpeechService } from "../src/speech/speech.service";

describe("SpeechService", () => {
  it("rejects oversized recordings before calling the transcription provider", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalGeminiKey = process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.GEMINI_API_KEY;
    const fetchSpy = jest.spyOn(global, "fetch" as any);
    const service = new SpeechService();

    const result = await service.transcribe("a".repeat(8_000_001), "audio/m4a");

    expect(result.text).toBe("");
    expect(result.error).toContain("too long");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    process.env.OPENAI_API_KEY = originalKey;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
  });

  it("returns a friendly retry message when Whisper is rate limited", async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalGeminiKey = process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";
    delete process.env.GEMINI_API_KEY;
    const fetchSpy = jest.spyOn(global, "fetch" as any).mockResolvedValue({ ok: false, status: 429 });
    const service = new SpeechService();

    const result = await service.transcribe(Buffer.from("hello").toString("base64"), "audio/m4a");

    expect(result.text).toBe("");
    expect(result.error).toContain("busy");
    expect(result.error).not.toContain("429");
    fetchSpy.mockRestore();
    process.env.OPENAI_API_KEY = originalKey;
    if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalGeminiKey;
  });
});
