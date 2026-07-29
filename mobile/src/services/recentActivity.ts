import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { fetchRecentActivitiesRemote, saveRecentActivitiesRemote } from "./api";

const ACTIVITY_KEY = "remi_recent_activity";

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
  const activities = uniqueActivities([next, ...existing]);
  await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
  saveRecentActivitiesRemote(activities).catch(() => undefined);
}

export async function getRecentActivities() {
  const local = await getLocalRecentActivities();
  if (local.length === 0) {
    try {
      const remote = await fetchRecentActivitiesRemote();
      const uniqueRemote = uniqueActivities(remote);
      if (uniqueRemote.length > 0) await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(uniqueRemote));
      return uniqueRemote;
    } catch {
      return local;
    }
  }

  fetchRecentActivitiesRemote()
    .then(async (remote) => {
      const uniqueRemote = uniqueActivities(remote);
      if (uniqueRemote.length >= local.length) {
        await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(uniqueRemote));
      } else if (local.length > 0) {
        await saveRecentActivitiesRemote(local);
      }
    })
    .catch(() => undefined);
  return local;
}

export async function getRecentActivity(activityId: string) {
  const activities = await getRecentActivities();
  return activities.find((activity) => activity.id === activityId) || null;
}

export async function updateRecentActivity(activityId: string, updates: Pick<RecentActivity, "title" | "detail">) {
  const existing = await getRecentActivities();
  const activities = existing.map((activity) =>
    activity.id === activityId
      ? {
          ...activity,
          title: updates.title.trim(),
          detail: updates.detail.trim(),
        }
      : activity,
  );
  await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(activities));
  saveRecentActivitiesRemote(activities).catch(() => undefined);
  return activities.find((activity) => activity.id === activityId) || null;
}

async function getLocalRecentActivities() {
  const stored = await AsyncStorage.getItem(ACTIVITY_KEY);
  if (stored) {
    const activities = parseRecentActivities(stored);
    const unique = uniqueActivities(activities);
    if (unique.length !== activities.length) {
      await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(unique)).catch(() => undefined);
    }
    return unique;
  }

  const legacy = await SecureStore.getItemAsync(ACTIVITY_KEY);
  if (legacy) {
    await AsyncStorage.setItem(ACTIVITY_KEY, legacy).catch(() => undefined);
    await SecureStore.deleteItemAsync(ACTIVITY_KEY).catch(() => undefined);
    return uniqueActivities(parseRecentActivities(legacy));
  }
  return [];
}

function uniqueActivities(activities: RecentActivity[]) {
  const seen = new Set<string>();
  return activities.filter((activity) => {
    const key = activity.id || `${activity.createdAt}-${activity.type}-${activity.title}-${activity.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseRecentActivities(stored: string): RecentActivity[] {
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as RecentActivity[]) : [];
  } catch {
    return [];
  }
}
