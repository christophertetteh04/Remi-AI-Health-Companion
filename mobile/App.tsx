import React, { useEffect, useState } from "react";
import { Alert, AppState, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "react-native-toast-notifications";
import * as SecureStore from "expo-secure-store";
import * as Sentry from "@sentry/react-native";
import RootNavigator from "./src/navigation/RootNavigator";
import LockScreen from "./src/screens/LockScreen";
import SplashScreen from "./src/screens/SplashScreen";
import RemiAlertHost from "./src/components/RemiAlertHost";
import RemiToast from "./src/components/RemiToast";
import { useAppLock } from "./src/hooks/useAppLock";
import { navigateFromNotification } from "./src/navigation/navigationRef";
import { backupAccountDataNow, restoreAccountDataIfNeeded } from "./src/services/accountRecovery";
import { getFreshAccessToken } from "./src/services/api";
import { installLargeTextScaling, loadDarkAppearanceEnabled, loadLargeTextEnabled, subscribeLargeText } from "./src/services/largeText";
import { installRemiAlert } from "./src/services/remiAlert";
import { colors } from "./src/theme/tokens";
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
installLargeTextScaling();
installRemiAlert(Alert);

export default function App() {
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [displayVersion, setDisplayVersion] = useState(0);
  const { lockEnabled, unlocked, checking: lockChecking, attemptUnlock } = useAppLock();

  const [bodyLoaded] = usePlusJakarta({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold });
  const [monoLoaded] = useJetBrainsMono({ JetBrainsMono_400Regular });
  const fontsReady = bodyLoaded && monoLoaded;

  useEffect(() => {
    const splashTimer = setTimeout(() => setSplashDone(true), 1500);
    const unsubscribeLargeText = subscribeLargeText(() => setDisplayVersion((version) => version + 1));

    (async () => {
      await loadDarkAppearanceEnabled();
      await loadLargeTextEnabled();
      const accessToken = await getFreshAccessToken();
      if (accessToken) {
        setHasSession(true);
        await restoreAccountDataIfNeeded();
        backupAccountDataNow().catch(() => undefined);
      }
      const onboardedFlag = await SecureStore.getItemAsync("remi_onboarded");
      const isOnboarded = onboardedFlag === "true";
      setOnboarded(isOnboarded);
      setReady(true);

      if (isOnboarded) {
        const { requestNotificationPermissions, scheduleWeeklyVitalsReminder, scheduleWeeklyHealthBriefReminder } = await import("./src/services/notifications");
        await requestNotificationPermissions();
        await scheduleWeeklyVitalsReminder();
        await scheduleWeeklyHealthBriefReminder();
      }
    })();

    let removeNotificationListener = () => {};
    const backupTimer = setInterval(() => {
      backupAccountDataNow().catch(() => undefined);
    }, 5 * 60 * 1000);
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") backupAccountDataNow().catch(() => undefined);
    });
    import("./src/services/notifications").then(({ addNotificationResponseListener }) => {
      const sub = addNotificationResponseListener((data) => {
        if (data?.type === "medication") navigateFromNotification("Meds");
        if (data?.type === "vitals") navigateFromNotification("Vitals");
        if (data?.type === "weekly_brief") navigateFromNotification("Chat");
        if (data?.type === "doctor_visit_prep") navigateFromNotification("Chat");
        if (data?.type === "doctor_visit") navigateFromNotification("Chat");
        if (data?.type === "doctor_visit_followup") navigateFromNotification("Chat");
      });
      removeNotificationListener = () => sub.remove();
    });
    return () => {
      clearTimeout(splashTimer);
      unsubscribeLargeText();
      removeNotificationListener();
      clearInterval(backupTimer);
      appStateSub.remove();
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
      <ToastProvider placement="top" duration={3200} animationType="slide-in">
        <StatusBar barStyle={colors.bg === "#090D13" ? "light-content" : "dark-content"} backgroundColor={colors.bg} />
        <RootNavigator hasSession={hasSession} onboarded={onboarded} displayVersion={displayVersion} />
        <RemiAlertHost />
        <RemiToast />
      </ToastProvider>
    </SafeAreaProvider>
  );
}
