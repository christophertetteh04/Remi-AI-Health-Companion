import * as SecureStore from "expo-secure-store";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

async function authHeader() {
  const token = await SecureStore.getItemAsync("remi_session_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function sendCheckinMessage(message: string, history: { from: string; text: string }[]) {
  const res = await fetch(`${API_BASE_URL}/checkins/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ message, history }),
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
