import * as SecureStore from "expo-secure-store";
import { analyticsRequestHeader } from "./posthog";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

export async function authHeader() {
  const token = await SecureStore.getItemAsync("remi_session_token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(await analyticsRequestHeader()),
  };
}

export type CheckinTopic = "general" | "sexual_health";

export async function sendCheckinMessage(
  message: string,
  history: { from: string; text: string }[],
  topic: CheckinTopic = "general",
) {
  const res = await fetch(`${API_BASE_URL}/checkins/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ message, history, topic }),
  });
  if (!res.ok) throw new Error(`Check-in request failed: ${res.status}`);
  return res.json(); // { reply: string, urgency: 'normal'|'monitor'|'urgent', crisisDetected: boolean }
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
