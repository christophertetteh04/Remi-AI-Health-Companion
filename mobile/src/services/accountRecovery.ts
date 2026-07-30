import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { authHeader, fetchAccountBackup, saveAccountBackup } from "./api";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
const EMERGENCY_STORAGE_KEY = "remi_emergency_info";
const BACKUP_SCHEMA_VERSION = "1";

const SECURE_BACKUP_KEYS = [
  "remi_profile",
  EMERGENCY_STORAGE_KEY,
  "remi_art_adherence_plan",
  "remi_asthma_respiratory_plan",
  "remi_kidney_function_plan",
  "remi_cholesterol_tracking_plan",
  "remi_thyroid_tracking_plan",
  "remi_doctor_visits",
  "remi_health_reminders_enabled",
  "remi_health_reminder_types",
  "remi_health_reminder_day",
  "remi_health_reminder_time",
  "remi_hydration_enabled",
  "remi_hydration_times",
  "remi_preventive_care_enabled",
  "remi_preventive_care_types",
  "remi_preventive_care_interval_months",
  "remi_quiet_hours",
  "remi_quiet_hours_start",
  "remi_quiet_hours_end",
  "remi_large_text",
  "remi_dark_appearance",
  "remi_analytics_enabled",
];

const ASYNC_BACKUP_KEYS = [
  "remi_chat_memory",
  "remi_recent_activity",
  "remi_cycle_detail_entries",
  "remi_medication_adherence_streaks",
];

// Runs once per app install, right after we know the user has a
// valid session. If this device has no local emergency info cached
// yet (a strong signal it's a new device or a reinstall) but the
// account has some saved in the cloud, pull it down automatically —
// this is what makes "I lost my phone" not mean "I lost my data."
export async function restoreAccountDataIfNeeded(): Promise<boolean> {
  const [restoredBackup, restoredEmergency] = await Promise.all([
    restoreGeneralAccountBackupIfNeeded(),
    restoreEmergencyInfoIfNeeded(),
  ]);
  return restoredBackup || restoredEmergency;
}

export async function backupAccountDataNow(): Promise<boolean> {
  try {
    const secureEntries = await Promise.all(
      SECURE_BACKUP_KEYS.map(async (key) => [key, await SecureStore.getItemAsync(key)] as const),
    );
    const asyncEntries = await Promise.all(
      ASYNC_BACKUP_KEYS.map(async (key) => [key, await AsyncStorage.getItem(key)] as const),
    );
    const secure = Object.fromEntries(secureEntries.filter(([, value]) => value !== null));
    const asyncStorage = Object.fromEntries(asyncEntries.filter(([, value]) => value !== null));
    const response = await saveAccountBackup({ secure, asyncStorage, backedUpAt: new Date().toISOString() }, BACKUP_SCHEMA_VERSION);
    return Boolean(response?.saved);
  } catch {
    return false;
  }
}

async function restoreGeneralAccountBackupIfNeeded() {
  const hasProfile = await SecureStore.getItemAsync("remi_profile");
  const hasRecent = await AsyncStorage.getItem("remi_recent_activity");
  if (hasProfile || hasRecent) return false;

  try {
    const backup = await fetchAccountBackup();
    const data = backup?.data;
    if (!data || typeof data !== "object") return false;
    await restoreSecureEntries((data as any).secure);
    await restoreAsyncEntries((data as any).asyncStorage);
    return true;
  } catch {
    return false;
  }
}

async function restoreSecureEntries(entries: Record<string, unknown> | undefined) {
  if (!entries || typeof entries !== "object") return;
  await Promise.all(
    Object.entries(entries)
      .filter(([key, value]) => SECURE_BACKUP_KEYS.includes(key) && typeof value === "string")
      .map(([key, value]) => SecureStore.setItemAsync(key, value as string).catch(() => undefined)),
  );
}

async function restoreAsyncEntries(entries: Record<string, unknown> | undefined) {
  if (!entries || typeof entries !== "object") return;
  await Promise.all(
    Object.entries(entries)
      .filter(([key, value]) => ASYNC_BACKUP_KEYS.includes(key) && typeof value === "string")
      .map(([key, value]) => AsyncStorage.setItem(key, value as string).catch(() => undefined)),
  );
}

async function restoreEmergencyInfoIfNeeded() {
  const alreadyCached = await SecureStore.getItemAsync(EMERGENCY_STORAGE_KEY);
  if (alreadyCached) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/emergency-info`, {
      headers: await authHeader(),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data) {
      await SecureStore.setItemAsync(EMERGENCY_STORAGE_KEY, JSON.stringify(data));
      return true; // this account already had data — a returning user, not a first-timer
    }
    return false;
  } catch {
    // Offline on first launch — not fatal, the user can still fill
    // this in manually, and restore will retry next launch since
    // nothing gets cached locally on failure.
    return false;
  }
}
