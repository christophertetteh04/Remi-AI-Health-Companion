import { useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const LOCK_TIMEOUT_MS = 60 * 1000; // re-lock after 60s in the background

export function useAppLock() {
  const [lockEnabled, setLockEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const enabled = await SecureStore.getItemAsync("remi_lock_enabled");
      setLockEnabled(enabled === "true");
      setUnlocked(enabled !== "true"); // no lock configured yet → don't block access
      setChecking(false);
    })();

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, []);

  const handleAppStateChange = (next: AppStateStatus) => {
    if (next === "background" || next === "inactive") {
      backgroundedAt.current = Date.now();
    } else if (next === "active" && backgroundedAt.current) {
      const elapsed = Date.now() - backgroundedAt.current;
      if (elapsed > LOCK_TIMEOUT_MS) {
        SecureStore.getItemAsync("remi_lock_enabled").then((enabled) => {
          if (enabled === "true") setUnlocked(false);
        });
      }
      backgroundedAt.current = null;
    }
  };

  const attemptUnlock = async (): Promise<boolean> => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      // No biometrics available/enrolled — device passcode fallback
      // still works via LocalAuthentication's own fallback UI on most
      // platforms, but if it's totally unavailable, don't lock the
      // user out of their own health data permanently.
      setUnlocked(true);
      return true;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Remi",
      fallbackLabel: "Use device passcode",
      disableDeviceFallback: false,
    });
    if (result.success) {
      setUnlocked(true);
      return true;
    }
    return false;
  };

  const enableLock = async () => {
    await SecureStore.setItemAsync("remi_lock_enabled", "true");
    setLockEnabled(true);
  };

  const disableLock = async () => {
    await SecureStore.deleteItemAsync("remi_lock_enabled");
    setLockEnabled(false);
  };

  return { lockEnabled, unlocked, checking, attemptUnlock, enableLock, disableLock };
}
