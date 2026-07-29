import * as SecureStore from "expo-secure-store";
import { analyticsRequestHeader } from "./posthog";
import { supabase } from "./supabaseClient";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
export const SESSION_TOKEN_KEY = "remi_session_token";
export const REFRESH_TOKEN_KEY = "remi_refresh_token";

export async function saveSessionTokens(session?: { access_token?: string; refresh_token?: string } | null) {
  if (session?.access_token) await SecureStore.setItemAsync(SESSION_TOKEN_KEY, session.access_token);
  if (session?.refresh_token) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refresh_token);
}

export async function clearSessionTokens() {
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function getFreshAccessToken() {
  let token = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  let refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.refresh_token) {
      refreshToken = data.session.refresh_token;
      await saveSessionTokens(data.session);
    }

    if (refreshToken) {
      if (token) {
        await supabase.auth.setSession({ access_token: token, refresh_token: refreshToken }).catch(() => undefined);
      }
      const { data: refreshed, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (!error && refreshed.session?.access_token) {
        await saveSessionTokens(refreshed.session);
        return refreshed.session.access_token;
      }
      console.log("Session refresh failed:", error?.message || "No refreshed session");
      await clearSessionTokens();
      return null;
    }

    if (data.session?.access_token) {
      await saveSessionTokens(data.session);
      return data.session.access_token;
    }
  }

  return supabase ? null : token;
}

export async function authHeader() {
  const token = await getFreshAccessToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(await analyticsRequestHeader()),
  };
}

export type CheckinTopic = "general" | "sexual_health";
export type ChatMemoryMessage = {
  from: "user" | "bot";
  text: string;
  imageUri?: string;
  urgency?: "normal" | "monitor" | "urgent";
  createdAt: string;
};
export type RecentActivityPayload = {
  id: string;
  type: "chat" | "lab" | "vitals" | "medication" | "lifestyle" | "safety";
  title: string;
  detail: string;
  createdAt: string;
  route?: string;
};

export async function sendCheckinMessage(
  message: string,
  history: { from: string; text: string }[],
  topic: CheckinTopic = "general",
  memoryContext?: {
    recentActivities?: RecentActivityPayload[];
    schedules?: { id: string; title: string; detail: string; route: string; condition?: string }[];
  },
) {
  const res = await fetch(`${API_BASE_URL}/checkins/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ message, history, topic, memoryContext }),
  });
  if (!res.ok) {
    let serverMessage = "";
    try {
      const body = await res.json();
      serverMessage = typeof body?.message === "string" ? body.message : "";
    } catch {}
    throw new Error(serverMessage || `Check-in request failed: ${res.status}`);
  }
  return res.json(); // { reply: string, urgency: 'normal'|'monitor'|'urgent', crisisDetected: boolean }
}

export async function fetchChatMemory() {
  const res = await fetch(`${API_BASE_URL}/checkins/memory`, { headers: await authHeader() });
  if (!res.ok) throw new Error(`Chat memory request failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.messages) ? (data.messages as ChatMemoryMessage[]) : [];
}

export async function saveChatMemoryRemote(messages: ChatMemoryMessage[]) {
  const res = await fetch(`${API_BASE_URL}/checkins/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`Chat memory save failed: ${res.status}`);
  return res.json();
}

export async function deleteChatMemoryRemote() {
  const res = await fetch(`${API_BASE_URL}/checkins/memory`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) throw new Error(`Chat memory delete failed: ${res.status}`);
  return res.json();
}

export async function fetchRecentActivitiesRemote() {
  const res = await fetch(`${API_BASE_URL}/checkins/recent-activities`, { headers: await authHeader() });
  if (!res.ok) throw new Error(`Recent activities request failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.activities) ? (data.activities as RecentActivityPayload[]) : [];
}

export async function saveRecentActivitiesRemote(activities: RecentActivityPayload[]) {
  const res = await fetch(`${API_BASE_URL}/checkins/recent-activities`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ activities }),
  });
  if (!res.ok) throw new Error(`Recent activities save failed: ${res.status}`);
  return res.json();
}

export async function getMedications() {
  const res = await fetch(`${API_BASE_URL}/medications`, { headers: await authHeader() });
  if (!res.ok) throw new Error(`Medications request failed: ${res.status}`);
  return res.json();
}

export async function markMedicationTaken(medicationId: string, takenAt: string) {
  const res = await fetch(`${API_BASE_URL}/medications/${medicationId}/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ takenAt }),
  });
  if (!res.ok) throw new Error(`Log request failed: ${res.status}`);
  return res.json();
}

export async function submitVitalsReading(reading: { systolic: number; diastolic: number; glucose?: number }) {
  const res = await fetch(`${API_BASE_URL}/vitals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(reading),
  });
  if (!res.ok) throw new Error(`Vitals request failed: ${res.status}`);
  return res.json(); // includes { tier: 'normal'|'monitor'|'urgent', message }
}

export async function getUnifiedTimeline(offset = 0, limit = 30) {
  const res = await fetch(`${API_BASE_URL}/health-summary/timeline?offset=${offset}&limit=${limit}`, { headers: await authHeader() });
  if (!res.ok) throw new Error(`Timeline request failed: ${res.status}`);
  return res.json();
}

export async function getCorrelationalInsights() {
  const res = await fetch(`${API_BASE_URL}/health-summary/correlations`, { headers: await authHeader() });
  if (!res.ok) throw new Error(`Correlations request failed: ${res.status}`);
  return res.json();
}

export async function generateDoctorPrepSummary(body: { visitDate?: string; concern?: string }) {
  const res = await fetch(`${API_BASE_URL}/health-summary/doctor-prep`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Doctor prep request failed: ${res.status}`);
  return res.json();
}

export async function exportHealthSummaryPdf(body: { visitDate?: string; concern?: string }, fileUri: string) {
  const params = new URLSearchParams();
  if (body.visitDate) params.set("visitDate", body.visitDate);
  if (body.concern) params.set("concern", body.concern);
  return {
    url: `${API_BASE_URL}/health-summary/export.pdf${params.toString() ? `?${params.toString()}` : ""}`,
    headers: await authHeader(),
    fileUri,
  };
}

export async function deleteAccountData(confirmation: "DELETE") {
  const res = await fetch(`${API_BASE_URL}/account-data`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ confirmation }),
  });
  if (!res.ok) throw new Error(`Delete account data request failed: ${res.status}`);
  return res.json();
}
