const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
const CONNECTIVITY_TIMEOUT_MS = 4500;

export type ConnectivityStatus = "online" | "slow" | "offline";

export async function checkConnectivity(): Promise<ConnectivityStatus> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const startedAt = Date.now();
  const timeout = controller ? setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT_MS) : null;

  try {
    await fetch(`${API_BASE_URL}/?connectivityCheck=${Date.now()}`, {
      method: "GET",
      signal: controller?.signal,
    });
    return Date.now() - startedAt > 2800 ? "slow" : "online";
  } catch (error) {
    const name = typeof error === "object" && error && "name" in error ? String((error as any).name) : "";
    return name === "AbortError" ? "slow" : "offline";
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
