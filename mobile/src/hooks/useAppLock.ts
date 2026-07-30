import { useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

export const LOCK_ENABLED_KEY = "remi_lock_enabled";
export const LOCK_TIMEOUT_KEY = "remi_lock_timeout_ms";
export const LOCK_PIN_KEY = "remi_lock_pin";
export const DEFAULT_LOCK_TIMEOUT_MS = 60 * 1000;

type LockListener = (enabled: boolean) => void;
const lockListeners = new Set<LockListener>();

function notifyLockListeners(enabled: boolean) {
  lockListeners.forEach((listener) => listener(enabled));
}

export function useAppLock() {
  const [lockEnabled, setLockEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const enabled = await SecureStore.getItemAsync(LOCK_ENABLED_KEY);
      const pin = await SecureStore.getItemAsync(LOCK_PIN_KEY);
      setLockEnabled(enabled === "true");
      setPinEnabled(Boolean(pin));
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
      if (await SecureStore.getItemAsync(LOCK_PIN_KEY)) return false;
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

  const setPin = async (pin: string) => {
    await SecureStore.setItemAsync(LOCK_PIN_KEY, pin);
    await SecureStore.setItemAsync(LOCK_ENABLED_KEY, "true");
    setPinEnabled(true);
    setLockEnabled(true);
    setUnlocked(true);
    notifyLockListeners(true);
  };

  const clearPin = async () => {
    await SecureStore.deleteItemAsync(LOCK_PIN_KEY);
    setPinEnabled(false);
  };

  const unlockWithPin = async (pin: string) => {
    const stored = await SecureStore.getItemAsync(LOCK_PIN_KEY);
    if (stored && stored === pin) {
      setUnlocked(true);
      return true;
    }
    return false;
  };

  return { lockEnabled, pinEnabled, unlocked, checking, attemptUnlock, enableLock, disableLock, setPin, clearPin, unlockWithPin };
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
