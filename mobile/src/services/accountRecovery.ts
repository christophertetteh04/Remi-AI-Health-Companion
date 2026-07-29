import * as SecureStore from "expo-secure-store";
import { authHeader } from "./api";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
const EMERGENCY_STORAGE_KEY = "remi_emergency_info";

// Runs once per app install, right after we know the user has a
// valid session. If this device has no local emergency info cached
// yet (a strong signal it's a new device or a reinstall) but the
// account has some saved in the cloud, pull it down automatically —
// this is what makes "I lost my phone" not mean "I lost my data."
export async function restoreAccountDataIfNeeded(): Promise<boolean> {
  const alreadyCached = await SecureStore.getItemAsync(EMERGENCY_STORAGE_KEY);
  if (alreadyCached) return false; // nothing to restore, already has local data

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
