import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import * as Sentry from "@sentry/react-native";
import RootNavigator from "./src/navigation/RootNavigator";
import LockScreen from "./src/screens/LockScreen";
import SplashScreen from "./src/screens/SplashScreen";
import { useAppLock } from "./src/hooks/useAppLock";
import { supabase } from "./src/services/supabaseClient";
import { navigateFromNotification } from "./src/navigation/navigationRef";
import { restoreAccountDataIfNeeded } from "./src/services/accountRecovery";
import { useFonts as usePlusJakarta, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold } from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts as useJetBrainsMono, JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";

// Crash/error reporting — set EXPO_PUBLIC_SENTRY_DSN in .env to
// enable. IMPORTANT: Sentry's default breadcrumbs can include things
// like navigation state and console logs — review its data-scrubbing
// config before shipping, so no symptom text or health data ever
// ends up in a crash report. See AI-BUILD-PROMPTS.md #20/#21.
const sentryDsn = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? "").trim();
if (sentryDsn && !sentryDsn.startsWith("your-")) {
  Sentry.init({ dsn: sentryDsn, tracesSampleRate: 0.2 });
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const { lockEnabled, unlocked, checking: lockChecking, attemptUnlock } = useAppLock();

  const [bodyLoaded] = usePlusJakarta({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold });
  const [monoLoaded] = useJetBrainsMono({ JetBrainsMono_400Regular });
  const fontsReady = bodyLoaded && monoLoaded;

  useEffect(() => {
    const splashTimer = setTimeout(() => setSplashDone(true), 1500);

    (async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await SecureStore.setItemAsync("remi_session_token", data.session.access_token);
          setHasSession(true);
          await restoreAccountDataIfNeeded();
        }
      }
      const onboardedFlag = await SecureStore.getItemAsync("remi_onboarded");
      const isOnboarded = onboardedFlag === "true";
      setOnboarded(isOnboarded);
      setReady(true);

      if (isOnboarded) {
        const { requestNotificationPermissions, scheduleWeeklyVitalsReminder } = await import("./src/services/notifications");
        await requestNotificationPermissions();
        await scheduleWeeklyVitalsReminder();
      }
    })();

    let removeNotificationListener = () => {};
    import("./src/services/notifications").then(({ addNotificationResponseListener }) => {
      const sub = addNotificationResponseListener((data) => {
        if (data?.type === "medication") navigateFromNotification("Meds");
        if (data?.type === "vitals") navigateFromNotification("Vitals");
      });
      removeNotificationListener = () => sub.remove();
    });
    return () => {
      clearTimeout(splashTimer);
      removeNotificationListener();
    };
  }, []);

  if (!ready || lockChecking || !fontsReady || !splashDone) return <SplashScreen />;

  // App-lock check happens BEFORE anything else renders, regardless
  // of auth/onboarding state — this is the shared-device privacy
  // requirement from planning.
  if (lockEnabled && !unlocked) {
    return (
      <SafeAreaProvider>
        <LockScreen onUnlock={attemptUnlock} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <RootNavigator hasSession={hasSession} onboarded={onboarded} />
    </SafeAreaProvider>
  );
}
