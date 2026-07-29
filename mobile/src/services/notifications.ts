import Constants, { ExecutionEnvironment } from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { trackEvent } from "./posthog";

type ExpoNotifications = typeof import("expo-notifications");
type NotificationSubscription = { remove: () => void };

const noopSubscription: NotificationSubscription = { remove: () => {} };
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let notificationsModule: ExpoNotifications | null | undefined;
export const QUIET_HOURS_ENABLED_KEY = "remi_quiet_hours";
export const QUIET_HOURS_START_KEY = "remi_quiet_hours_start";
export const QUIET_HOURS_END_KEY = "remi_quiet_hours_end";
export const DEFAULT_QUIET_HOURS_START = "22:00";
export const DEFAULT_QUIET_HOURS_END = "07:00";
export const PREVENTIVE_CARE_ENABLED_KEY = "remi_preventive_care_enabled";
export const PREVENTIVE_CARE_TYPES_KEY = "remi_preventive_care_types";
export const PREVENTIVE_CARE_INTERVAL_KEY = "remi_preventive_care_interval_months";
export const PREVENTIVE_CARE_REMINDER_IDS_KEY = "remi_preventive_care_reminder_ids";
export const DEFAULT_PREVENTIVE_CARE_TYPES = ["dental", "vision"];
export const DEFAULT_PREVENTIVE_CARE_INTERVAL_MONTHS = 6;
export const HYDRATION_ENABLED_KEY = "remi_hydration_enabled";
export const HYDRATION_TIMES_KEY = "remi_hydration_times";
export const HYDRATION_REMINDER_IDS_KEY = "remi_hydration_reminder_ids";
export const DEFAULT_HYDRATION_TIMES = ["10:00", "16:00"];
export const HEALTH_REMINDERS_ENABLED_KEY = "remi_health_reminders_enabled";
export const HEALTH_REMINDER_TYPES_KEY = "remi_health_reminder_types";
export const HEALTH_REMINDER_DAY_KEY = "remi_health_reminder_day";
export const HEALTH_REMINDER_TIME_KEY = "remi_health_reminder_time";
export const HEALTH_REMINDER_IDS_KEY = "remi_health_reminder_ids";
export const DEFAULT_HEALTH_REMINDER_TYPES = ["vitals", "checkin"];
export const DEFAULT_HEALTH_REMINDER_DAY = 1;
export const DEFAULT_HEALTH_REMINDER_TIME = "09:00";
export const WEEKLY_BRIEF_REMINDER_ID_KEY = "remi_weekly_brief_reminder_id";

async function getNotifications() {
  if (isExpoGo) return null;
  if (notificationsModule !== undefined) return notificationsModule;

  notificationsModule = await import("expo-notifications");
  notificationsModule.setNotificationHandler({
    handleNotification: async () => {
      const quiet = await isQuietHoursActive();
      return {
        shouldShowAlert: !quiet,
        shouldShowBanner: !quiet,
        shouldShowList: !quiet,
        shouldPlaySound: !quiet,
        shouldSetBadge: false,
      };
    },
  });
  return notificationsModule;
}

export async function isQuietHoursActive(now = new Date()) {
  const enabled = (await SecureStore.getItemAsync(QUIET_HOURS_ENABLED_KEY)) === "true";
  if (!enabled) return false;

  const start = parseTime(await SecureStore.getItemAsync(QUIET_HOURS_START_KEY), DEFAULT_QUIET_HOURS_START);
  const end = parseTime(await SecureStore.getItemAsync(QUIET_HOURS_END_KEY), DEFAULT_QUIET_HOURS_END);
  const current = now.getHours() * 60 + now.getMinutes();

  if (start === end) return true;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function parseTime(value: string | null, fallback: string) {
  const raw = value || fallback;
  const [hourRaw, minuteRaw] = raw.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return parseTime(fallback, "22:00");
  return Math.max(0, Math.min(23, hour)) * 60 + Math.max(0, Math.min(59, minute));
}

export async function requestNotificationPermissions() {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === "granted";
  }
  return true;
}

export async function scheduleMedicationReminder(medicationId: string, hour: number, minute: number) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Remi reminder",
      body: "You have a medication scheduled now.",
      data: { type: "medication", medicationId },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });

  const map = JSON.parse((await SecureStore.getItemAsync("remi_reminder_map")) || "{}");
  map[medicationId] = id;
  await SecureStore.setItemAsync("remi_reminder_map", JSON.stringify(map));
  await trackEvent("medication_reminder_scheduled");
  return id;
}

export async function cancelMedicationReminder(medicationId: string) {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const map = JSON.parse((await SecureStore.getItemAsync("remi_reminder_map")) || "{}");
  const id = map[medicationId];
  if (id) {
    await Notifications.cancelScheduledNotificationAsync(id);
    delete map[medicationId];
    await SecureStore.setItemAsync("remi_reminder_map", JSON.stringify(map));
  }
}

export async function scheduleWeeklyVitalsReminder() {
  const ids = await scheduleHealthReminders({
    types: ["vitals"],
    weekday: DEFAULT_HEALTH_REMINDER_DAY,
    time: DEFAULT_HEALTH_REMINDER_TIME,
  });
  return ids?.[0] || null;
}

export async function scheduleWeeklyHealthBriefReminder() {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const existing = await SecureStore.getItemAsync(WEEKLY_BRIEF_REMINDER_ID_KEY);
  if (existing) await Notifications.cancelScheduledNotificationAsync(existing);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Remi weekly brief",
      body: "Your weekly health summary is ready in Chat.",
      data: { type: "weekly_brief" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 9, minute: 0 },
  });
  await SecureStore.setItemAsync(WEEKLY_BRIEF_REMINDER_ID_KEY, id);
  return id;
}

export async function scheduleHealthReminders({ types, weekday, time }: { types: string[]; weekday: number; time: string }) {
  const Notifications = await getNotifications();
  await SecureStore.setItemAsync(HEALTH_REMINDERS_ENABLED_KEY, "true");
  await SecureStore.setItemAsync(HEALTH_REMINDER_TYPES_KEY, JSON.stringify(types));
  await SecureStore.setItemAsync(HEALTH_REMINDER_DAY_KEY, String(weekday));
  await SecureStore.setItemAsync(HEALTH_REMINDER_TIME_KEY, time);
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  await cancelHealthReminders(false);

  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const ids: string[] = [];
  for (const type of types) {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "Remi health reminder", body: healthReminderMessage(type), data: { type: healthReminderDataType(type), reminderType: type } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute },
    });
    ids.push(id);
  }
  await SecureStore.setItemAsync(HEALTH_REMINDER_IDS_KEY, JSON.stringify(ids));
  await SecureStore.setItemAsync("remi_vitals_reminder_id", ids[0] || "");
  return ids;
}

export async function cancelHealthReminders(clearPreferences = true) {
  const Notifications = await getNotifications();
  const existingIds = await SecureStore.getItemAsync(HEALTH_REMINDER_IDS_KEY);
  const legacyId = await SecureStore.getItemAsync("remi_vitals_reminder_id");

  if (Notifications) {
    const ids: string[] = existingIds ? JSON.parse(existingIds) : [];
    if (legacyId) ids.push(legacyId);
    await Promise.all([...new Set(ids.filter(Boolean))].map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  }

  await SecureStore.deleteItemAsync(HEALTH_REMINDER_IDS_KEY);
  await SecureStore.deleteItemAsync("remi_vitals_reminder_id");
  if (clearPreferences) await SecureStore.deleteItemAsync(HEALTH_REMINDERS_ENABLED_KEY);
}

function healthReminderMessage(type: string) {
  if (type === "vitals") return "Time for your weekly vitals check-in.";
  if (type === "checkin") return "Take a moment for a quick Remi health check-in.";
  if (type === "medication_review") return "Review your medication list and reminders.";
  return "Time for your Remi health reminder.";
}

function healthReminderDataType(type: string) {
  if (type === "vitals") return "vitals";
  if (type === "checkin") return "chat";
  if (type === "medication_review") return "meds";
  return "health_reminder";
}

export function addNotificationResponseListener(onTap: (data: any) => void): NotificationSubscription {
  if (isExpoGo) return noopSubscription;

  let innerSub: NotificationSubscription | null = null;
  getNotifications().then((Notifications) => {
    if (!Notifications) return;
    innerSub = Notifications.addNotificationResponseReceivedListener((response) => {
      onTap(response.notification.request.content.data);
    });
  });

  return {
    remove: () => innerSub?.remove(),
  };
}

export async function scheduleHydrationReminder() {
  return scheduleHydrationReminders(DEFAULT_HYDRATION_TIMES);
}

export async function scheduleHydrationReminders(times: string[]) {
  const Notifications = await getNotifications();
  await SecureStore.setItemAsync(HYDRATION_ENABLED_KEY, "true");
  await SecureStore.setItemAsync(HYDRATION_TIMES_KEY, JSON.stringify(times));
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  await cancelHydrationReminder(false);

  const ids: string[] = [];
  for (const time of times) {
    const [hourRaw, minuteRaw] = time.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "Remi hydration", body: hydrationReminderMessage(time), data: { type: "hydration" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
    ids.push(id);
  }
  await SecureStore.setItemAsync(HYDRATION_REMINDER_IDS_KEY, JSON.stringify(ids));
  return ids;
}

export async function cancelHydrationReminder(clearPreferences = true) {
  const Notifications = await getNotifications();
  const existing = await SecureStore.getItemAsync(HYDRATION_REMINDER_IDS_KEY);
  if (Notifications && existing) {
    const ids: string[] = JSON.parse(existing);
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  }
  await SecureStore.deleteItemAsync(HYDRATION_REMINDER_IDS_KEY);
  if (clearPreferences) await SecureStore.deleteItemAsync(HYDRATION_ENABLED_KEY);
}

function hydrationReminderMessage(time: string) {
  if (time < "12:00") return "A gentle water check for your morning.";
  if (time < "17:00") return "A quick hydration pause for your afternoon.";
  return "A light hydration reminder for the evening.";
}

export async function scheduleAnnualCheckupReminder(lastVisitISODate: string) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const last = new Date(lastVisitISODate);
  const target = new Date(last);
  target.setFullYear(target.getFullYear() + 1);

  const existing = await SecureStore.getItemAsync("remi_checkup_reminder_id");
  if (existing) await Notifications.cancelScheduledNotificationAsync(existing);

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: "Remi reminder", body: "It's been about a year since your last check-up.", data: { type: "checkup" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
  });
  await SecureStore.setItemAsync("remi_checkup_reminder_id", id);
  return id;
}

export async function scheduleKidneyLabReminder(nextLabISODate: string) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const target = new Date(nextLabISODate);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(9, 0, 0, 0);

  const existing = await SecureStore.getItemAsync("remi_kidney_lab_reminder_id");
  if (existing) await Notifications.cancelScheduledNotificationAsync(existing);

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: "Remi reminder", body: "Your kidney lab follow-up is due today.", data: { type: "lab", condition: "kidney" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
  });
  await SecureStore.setItemAsync("remi_kidney_lab_reminder_id", id);
  return id;
}

export async function scheduleCholesterolLabReminder(nextLabISODate: string) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const target = new Date(nextLabISODate);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(9, 0, 0, 0);

  const existing = await SecureStore.getItemAsync("remi_cholesterol_lab_reminder_id");
  if (existing) await Notifications.cancelScheduledNotificationAsync(existing);

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: "Remi reminder", body: "Your cholesterol lab follow-up is due today.", data: { type: "lab", condition: "cholesterol" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
  });
  await SecureStore.setItemAsync("remi_cholesterol_lab_reminder_id", id);
  return id;
}

export async function scheduleThyroidLabReminder(nextLabISODate: string) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const target = new Date(nextLabISODate);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(9, 0, 0, 0);

  const existing = await SecureStore.getItemAsync("remi_thyroid_lab_reminder_id");
  if (existing) await Notifications.cancelScheduledNotificationAsync(existing);

  const id = await Notifications.scheduleNotificationAsync({
    content: { title: "Remi reminder", body: "Your thyroid lab follow-up is due today.", data: { type: "lab", condition: "thyroid" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
  });
  await SecureStore.setItemAsync("remi_thyroid_lab_reminder_id", id);
  return id;
}

export async function schedulePlanDateReminder(reminderKey: string, dateISO: string, title: string, body: string, data: Record<string, string> = {}) {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const target = new Date(dateISO);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(9, 0, 0, 0);

  const existing = await SecureStore.getItemAsync(reminderKey);
  if (existing) await Notifications.cancelScheduledNotificationAsync(existing);

  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
  });
  await SecureStore.setItemAsync(reminderKey, id);
  return id;
}

export async function scheduleDentalVisionReminder() {
  const ids = await schedulePreventiveCareReminders({
    types: DEFAULT_PREVENTIVE_CARE_TYPES,
    intervalMonths: DEFAULT_PREVENTIVE_CARE_INTERVAL_MONTHS,
  });
  return ids?.[0] || null;
}

export async function schedulePreventiveCareReminders({
  types,
  intervalMonths,
}: {
  types: string[];
  intervalMonths: number;
}) {
  const Notifications = await getNotifications();
  await SecureStore.setItemAsync(PREVENTIVE_CARE_ENABLED_KEY, "true");
  await SecureStore.setItemAsync(PREVENTIVE_CARE_TYPES_KEY, JSON.stringify(types));
  await SecureStore.setItemAsync(PREVENTIVE_CARE_INTERVAL_KEY, String(intervalMonths));
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  await cancelPreventiveCareReminders(false);

  const ids: string[] = [];
  for (const type of types) {
    const target = new Date();
    target.setMonth(target.getMonth() + intervalMonths);
    target.setHours(9, 0, 0, 0);
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "Remi preventive care", body: preventiveCareMessage(type), data: { type: "preventive_care", preventiveType: type } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
    });
    ids.push(id);
  }
  await SecureStore.setItemAsync(PREVENTIVE_CARE_REMINDER_IDS_KEY, JSON.stringify(ids));
  await SecureStore.setItemAsync("remi_dental_vision_reminder_id", ids[0] || "");
  return ids;
}

export async function cancelDentalVisionReminder() {
  await cancelPreventiveCareReminders();
}

export async function cancelPreventiveCareReminders(clearPreferences = true) {
  const Notifications = await getNotifications();
  const existingIds = await SecureStore.getItemAsync(PREVENTIVE_CARE_REMINDER_IDS_KEY);
  const legacyId = await SecureStore.getItemAsync("remi_dental_vision_reminder_id");

  if (Notifications) {
    const ids: string[] = existingIds ? JSON.parse(existingIds) : [];
    if (legacyId) ids.push(legacyId);
    await Promise.all([...new Set(ids.filter(Boolean))].map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  }

  await SecureStore.deleteItemAsync(PREVENTIVE_CARE_REMINDER_IDS_KEY);
  await SecureStore.deleteItemAsync("remi_dental_vision_reminder_id");
  if (clearPreferences) await SecureStore.deleteItemAsync(PREVENTIVE_CARE_ENABLED_KEY);
}

function preventiveCareMessage(type: string) {
  if (type === "dental") return "Worth booking a dental check soon.";
  if (type === "vision") return "Worth booking a vision check soon.";
  if (type === "general") return "Worth planning a preventive care check soon.";
  return "Worth checking in on preventive care soon.";
}
