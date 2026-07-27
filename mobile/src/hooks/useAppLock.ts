import { useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

export const LOCK_ENABLED_KEY = "remi_lock_enabled";
export const LOCK_TIMEOUT_KEY = "remi_lock_timeout_ms";
export const DEFAULT_LOCK_TIMEOUT_MS = 60 * 1000;

type LockListener = (enabled: boolean) => void;
const lockListeners = new Set<LockListener>();

function notifyLockListeners(enabled: boolean) {
  lockListeners.forEach((listener) => listener(enabled));
}

export function useAppLock() {
  const [lockEnabled, setLockEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const enabled = await SecureStore.getItemAsync(LOCK_ENABLED_KEY);
      setLockEnabled(enabled === "true");
      setUnlocked(enabled !== "true"); // no lock configured yet → don't block access
      setChecking(false);
    })();

    const unsubscribe = subscribeToLockChanges((enabled) => {
      setLockEnabled(enabled);
      if (!enabled) setUnlocked(true);
    });
    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, []);

  const handleAppStateChange = (next: AppStateStatus) => {
    if (next === "background" || next === "inactive") {
      backgroundedAt.current = Date.now();
    } else if (next === "active" && backgroundedAt.current) {
      const elapsed = Date.now() - backgroundedAt.current;
      getLockTimeoutMs().then((timeoutMs) => {
        if (elapsed >= timeoutMs) {
          SecureStore.getItemAsync(LOCK_ENABLED_KEY).then((enabled) => {
            if (enabled === "true") setUnlocked(false);
          });
        }
      });
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
    await SecureStore.setItemAsync(LOCK_ENABLED_KEY, "true");
    setLockEnabled(true);
    setUnlocked(true);
    notifyLockListeners(true);
  };

  const disableLock = async () => {
    await SecureStore.deleteItemAsync(LOCK_ENABLED_KEY);
    setLockEnabled(false);
    setUnlocked(true);
    notifyLockListeners(false);
  };

  return { lockEnabled, unlocked, checking, attemptUnlock, enableLock, disableLock };
}

function subscribeToLockChanges(listener: LockListener) {
  lockListeners.add(listener);
  return () => lockListeners.delete(listener);
}

async function getLockTimeoutMs() {
  const stored = await SecureStore.getItemAsync(LOCK_TIMEOUT_KEY);
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_LOCK_TIMEOUT_MS;
}
