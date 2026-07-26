import * as SecureStore from "expo-secure-store";

const ACTIVITY_KEY = "remi_recent_activity";
const MAX_ITEMS = 12;

export type RecentActivity = {
  id: string;
  type: "chat" | "lab" | "vitals" | "medication" | "lifestyle" | "safety";
  title: string;
  detail: string;
  createdAt: string;
  route?: string;
};

export async function addRecentActivity(activity: Omit<RecentActivity, "id" | "createdAt">) {
  const existing = await getRecentActivities();
  const next: RecentActivity = {
    ...activity,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  await SecureStore.setItemAsync(ACTIVITY_KEY, JSON.stringify([next, ...existing].slice(0, MAX_ITEMS)));
}

export async function getRecentActivities() {
  const stored = await SecureStore.getItemAsync(ACTIVITY_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as RecentActivity[]) : [];
  } catch {
    return [];
  }
}
