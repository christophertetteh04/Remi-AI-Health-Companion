import Constants, { ExecutionEnvironment } from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { trackEvent } from "./posthog";

type ExpoNotifications = typeof import("expo-notifications");
type NotificationSubscription = { remove: () => void };

const noopSubscription: NotificationSubscription = { remove: () => {} };
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let notificationsModule: ExpoNotifications | null | undefined;

async function getNotifications() {
  if (isExpoGo) return null;
  if (notificationsModule !== undefined) return notificationsModule;

  notificationsModule = await import("expo-notifications");
  notificationsModule.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  return notificationsModule;
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
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const already = await SecureStore.getItemAsync("remi_vitals_reminder_id");
  if (already) return already;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Remi reminder",
      body: "Time for your weekly check-in.",
      data: { type: "vitals" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 9, minute: 0 },
  });
  await SecureStore.setItemAsync("remi_vitals_reminder_id", id);
  return id;
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
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const existing = await SecureStore.getItemAsync("remi_hydration_reminder_ids");
  if (existing) return JSON.parse(existing);

  const morning = await Notifications.scheduleNotificationAsync({
    content: { title: "Remi reminder", body: "Stay hydrated today.", data: { type: "hydration" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 10, minute: 0 },
  });
  const afternoon = await Notifications.scheduleNotificationAsync({
    content: { title: "Remi reminder", body: "Stay hydrated today.", data: { type: "hydration" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 16, minute: 0 },
  });
  const ids = [morning, afternoon];
  await SecureStore.setItemAsync("remi_hydration_reminder_ids", JSON.stringify(ids));
  return ids;
}

export async function cancelHydrationReminder() {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const existing = await SecureStore.getItemAsync("remi_hydration_reminder_ids");
  if (!existing) return;
  const ids: string[] = JSON.parse(existing);
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await SecureStore.deleteItemAsync("remi_hydration_reminder_ids");
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

export async function scheduleDentalVisionReminder() {
  const Notifications = await getNotifications();
  if (!Notifications) return null;

  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const existing = await SecureStore.getItemAsync("remi_dental_vision_reminder_id");
  if (existing) return existing;

  const target = new Date();
  target.setMonth(target.getMonth() + 6);
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: "Remi reminder", body: "Worth booking a dental or vision check soon.", data: { type: "dental_vision" } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: target },
  });
  await SecureStore.setItemAsync("remi_dental_vision_reminder_id", id);
  return id;
}

export async function cancelDentalVisionReminder() {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const existing = await SecureStore.getItemAsync("remi_dental_vision_reminder_id");
  if (!existing) return;
  await Notifications.cancelScheduledNotificationAsync(existing);
  await SecureStore.deleteItemAsync("remi_dental_vision_reminder_id");
}
