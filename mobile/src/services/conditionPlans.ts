import * as SecureStore from "expo-secure-store";

export type SavedConditionPlan = {
  condition: string;
  title: string;
  subtitle: string;
  storageKey: string;
  details: { label: string; value: string }[];
  schedules: { title: string; detail: string; route: string; condition?: string }[];
};

export type UserSchedule = {
  id: string;
  title: string;
  detail: string;
  route: string;
  condition?: string;
};

const PLAN_CONFIG = [
  {
    condition: "hiv_art_adherence",
    title: "ART adherence plan",
    subtitle: "Medication and clinic support",
    storageKey: "remi_art_adherence_plan",
    fields: [
      ["Medication", "medicationName"],
      ["Dose", "dose"],
      ["Daily reminder", "reminderTime"],
      ["Clinic/refill date", "clinicDate"],
      ["Notes", "notes"],
    ],
    scheduleFields: [
      ["ART medication reminder", "reminderTime", "Meds"],
      ["Clinic or refill follow-up", "clinicDate", "Conditions"],
    ],
  },
  {
    condition: "asthma",
    title: "Asthma / respiratory plan",
    subtitle: "Symptoms, triggers, and inhaler support",
    storageKey: "remi_asthma_respiratory_plan",
    fields: [
      ["Severity", "severity"],
      ["Peak flow", "peakFlow"],
      ["Triggers", "triggers"],
      ["Controller medication", "controllerMedication"],
      ["Rescue inhaler", "rescueMedication"],
      ["Controller reminder", "reminderTime"],
    ],
    scheduleFields: [["Controller medication reminder", "reminderTime", "Meds"]],
  },
  {
    condition: "kidney",
    title: "Kidney function plan",
    subtitle: "Labs and clinic follow-up",
    storageKey: "remi_kidney_function_plan",
    fields: [
      ["Status", "stage"],
      ["eGFR", "egfr"],
      ["Creatinine", "creatinine"],
      ["Urine ACR/protein", "urineAcr"],
      ["Blood pressure", "bloodPressure"],
      ["Next lab", "nextLabDate"],
      ["Clinic visit", "nephrologyDate"],
    ],
    scheduleFields: [
      ["Kidney lab follow-up", "nextLabDate", "LabUpload"],
      ["Nephrology or clinic visit", "nephrologyDate", "Conditions"],
    ],
  },
  {
    condition: "cholesterol",
    title: "Cholesterol tracking plan",
    subtitle: "Lipid labs and heart-risk support",
    storageKey: "remi_cholesterol_tracking_plan",
    fields: [
      ["Risk level", "riskLevel"],
      ["Total cholesterol", "totalCholesterol"],
      ["LDL", "ldl"],
      ["HDL", "hdl"],
      ["Triglycerides", "triglycerides"],
      ["Medication", "medicationName"],
      ["Next lipid test", "nextLipidTestDate"],
    ],
    scheduleFields: [
      ["Cholesterol medication reminder", "medicationTime", "Meds"],
      ["Lipid test follow-up", "nextLipidTestDate", "LabUpload"],
    ],
  },
  {
    condition: "thyroid",
    title: "Thyroid tracking plan",
    subtitle: "Labs, symptoms, and medication timing",
    storageKey: "remi_thyroid_tracking_plan",
    fields: [
      ["Status", "thyroidStatus"],
      ["TSH", "tsh"],
      ["Free T4", "freeT4"],
      ["Free T3", "freeT3"],
      ["Symptoms", "symptoms"],
      ["Medication", "medicationName"],
      ["Medication reminder", "medicationTime"],
      ["Next lab", "nextLabDate"],
      ["Follow-up", "followUpDate"],
    ],
    scheduleFields: [
      ["Thyroid medication reminder", "medicationTime", "Meds"],
      ["Thyroid lab follow-up", "nextLabDate", "LabUpload"],
      ["Thyroid appointment", "followUpDate", "Conditions"],
    ],
  },
];

export async function getSavedConditionPlans(): Promise<SavedConditionPlan[]> {
  const plans = await Promise.all(
    PLAN_CONFIG.map(async (config) => {
      const raw = await SecureStore.getItemAsync(config.storageKey);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        const details = config.fields
          .map(([label, key]) => ({ label, value: displayValue(parsed[key]) }))
          .filter((item) => item.value);
        if (!details.length && !Object.keys(parsed || {}).length) return null;
        const schedules = config.scheduleFields
          .map(([title, key, route]) => {
            const value = displayValue(parsed[key]);
            if (!value) return null;
            return { title, detail: value, route, condition: config.condition };
          })
          .filter(Boolean) as SavedConditionPlan["schedules"];
        return { ...config, details, schedules };
      } catch {
        return null;
      }
    }),
  );
  return plans.filter(Boolean) as SavedConditionPlan[];
}

export async function hasSavedPlan(condition: string) {
  const plans = await getSavedConditionPlans();
  return plans.some((plan) => plan.condition === condition);
}

export async function getUserSchedules(): Promise<UserSchedule[]> {
  const plans = await getSavedConditionPlans();
  const planSchedules = plans.flatMap((plan) =>
    plan.schedules.map((schedule, index) => ({
      id: `${plan.condition}-${index}`,
      title: schedule.title,
      detail: schedule.detail,
      route: schedule.route,
      condition: schedule.condition,
    })),
  );
  const preferenceSchedules = await getPreferenceSchedules();
  return [...planSchedules, ...preferenceSchedules].slice(0, 12);
}

function displayValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

async function getPreferenceSchedules(): Promise<UserSchedule[]> {
  const schedules: UserSchedule[] = [];

  const hydrationEnabled = (await SecureStore.getItemAsync("remi_hydration_enabled")) === "true";
  if (hydrationEnabled) {
    const times = parseArray(await SecureStore.getItemAsync("remi_hydration_times"));
    if (times.length) {
      schedules.push({
        id: "hydration-reminders",
        title: "Hydration reminders",
        detail: times.join(", "),
        route: "HydrationReminderSettings",
      });
    }
  }

  const healthEnabled = (await SecureStore.getItemAsync("remi_health_reminders_enabled")) === "true";
  if (healthEnabled) {
    const types = parseArray(await SecureStore.getItemAsync("remi_health_reminder_types"));
    const day = await SecureStore.getItemAsync("remi_health_reminder_day");
    const time = await SecureStore.getItemAsync("remi_health_reminder_time");
    schedules.push({
      id: "health-reminders",
      title: "Health reminders",
      detail: `${types.map(labelReminderType).join(", ") || "Health check"}${time ? ` at ${time}` : ""}${day ? ` on ${weekdayLabel(day)}` : ""}`,
      route: "HealthReminderSettings",
    });
  }

  const preventiveEnabled = (await SecureStore.getItemAsync("remi_preventive_care_enabled")) === "true";
  if (preventiveEnabled) {
    const types = parseArray(await SecureStore.getItemAsync("remi_preventive_care_types"));
    const interval = await SecureStore.getItemAsync("remi_preventive_care_interval_months");
    schedules.push({
      id: "preventive-care-reminders",
      title: "Preventive care reminders",
      detail: `${types.map(labelReminderType).join(", ") || "Preventive care"}${interval ? ` every ${interval} month${interval === "1" ? "" : "s"}` : ""}`,
      route: "PreventiveReminderSettings",
    });
  }

  return schedules;
}

function parseArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function labelReminderType(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function weekdayLabel(value: string) {
  const labels: Record<string, string> = {
    "1": "Monday",
    "2": "Tuesday",
    "3": "Wednesday",
    "4": "Thursday",
    "5": "Friday",
    "6": "Saturday",
    "7": "Sunday",
  };
  return labels[value] || "your selected day";
}
