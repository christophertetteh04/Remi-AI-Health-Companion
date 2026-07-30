import * as SecureStore from "expo-secure-store";
import { generateDoctorPrepSummary } from "./api";
import { addRecentActivity } from "./recentActivity";
import { scheduleDoctorVisitNotifications } from "./notifications";

export const DOCTOR_VISITS_KEY = "remi_doctor_visits";

export type DoctorVisitPlan = {
  id: string;
  urgency: "normal" | "monitor" | "urgent";
  concern: string;
  bodyLocation?: string;
  visitDate: string;
  prepSummary: string;
  createdAt: string;
};

export async function createDoctorVisitPlan(input: {
  urgency: "normal" | "monitor" | "urgent";
  concern: string;
  bodyLocation?: string;
  visitDate: Date;
}) {
  const visitDate = input.visitDate.toISOString();
  const concern = [input.concern.trim(), input.bodyLocation ? `Location: ${input.bodyLocation}` : ""].filter(Boolean).join("\n");
  let prepSummary = "Bring your recent symptoms, medication list, allergies, vitals, and any photos or uploaded documents to your visit.";

  try {
    const prep = await generateDoctorPrepSummary({ visitDate, concern });
    if (typeof prep?.summary === "string" && prep.summary.trim()) prepSummary = prep.summary.trim();
    else if (typeof prep?.text === "string" && prep.text.trim()) prepSummary = prep.text.trim();
  } catch {
    prepSummary = [
      "Doctor-visit prep:",
      input.concern.trim() ? `Concern: ${input.concern.trim()}` : "Concern: recent Remi check-in",
      input.bodyLocation ? `Body-map location: ${input.bodyLocation}` : "",
      "Mention when it started, how severe it feels, what makes it better or worse, medicines tried, and any new or worsening symptoms.",
    ].filter(Boolean).join("\n");
  }

  const visit: DoctorVisitPlan = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    urgency: input.urgency,
    concern: input.concern.trim() || "Doctor visit recommended from Remi check-in",
    bodyLocation: input.bodyLocation,
    visitDate,
    prepSummary,
    createdAt: new Date().toISOString(),
  };

  const existing = await getDoctorVisitPlans();
  await SecureStore.setItemAsync(DOCTOR_VISITS_KEY, JSON.stringify([visit, ...existing].slice(0, 20)));
  await scheduleDoctorVisitNotifications(visit);
  await addRecentActivity({
    type: "chat",
    title: "Doctor visit planned",
    detail: `${urgencyLabel(input.urgency)} visit reminder set${input.bodyLocation ? ` for ${input.bodyLocation}` : ""}.`,
    route: "Chat",
  });
  return visit;
}

export async function getDoctorVisitPlans(): Promise<DoctorVisitPlan[]> {
  try {
    const stored = await SecureStore.getItemAsync(DOCTOR_VISITS_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed as DoctorVisitPlan[] : [];
  } catch {
    return [];
  }
}

function urgencyLabel(urgency: DoctorVisitPlan["urgency"]) {
  if (urgency === "urgent") return "Urgent";
  if (urgency === "monitor") return "Monitor";
  return "Routine";
}
