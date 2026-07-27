// PRIVACY RULE: never send symptom descriptions, lab explanations, medication names,
// chat messages, or any other free-text health content to PostHog. Only event names
// and categorical properties like tier, condition, or screen name are allowed.
import * as SecureStore from "expo-secure-store";
import PostHog from "posthog-react-native";

export const ANALYTICS_KEY = "remi_analytics_enabled";

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

type AnalyticsEvent =
  | "signup_completed"
  | "onboarding_completed"
  | "checkin_message_sent"
  | "medication_reminder_scheduled"
  | "crisis_protocol_triggered";

type AnalyticsProperties = {
  tier?: "normal" | "monitor" | "urgent";
};

let client: PostHog | null | undefined;

function posthogClient() {
  if (!POSTHOG_API_KEY) return null;
  if (client === undefined) {
    client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      captureAppLifecycleEvents: false,
      enableSessionReplay: false,
    });
  }
  return client;
}

export async function isAnalyticsEnabled() {
  return (await SecureStore.getItemAsync(ANALYTICS_KEY)) !== "false";
}

export async function setAnalyticsEnabled(enabled: boolean) {
  await SecureStore.setItemAsync(ANALYTICS_KEY, enabled ? "true" : "false");
  const ph = posthogClient();
  if (!ph) return;
  if (enabled) await ph.optIn();
  else await ph.optOut();
}

export async function analyticsRequestHeader() {
  return { "X-Remi-Analytics-Enabled": (await isAnalyticsEnabled()) ? "true" : "false" };
}

export async function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties) {
  if (!(await isAnalyticsEnabled())) return;
  posthogClient()?.capture(event, properties);
}
