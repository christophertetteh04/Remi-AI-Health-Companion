import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Activity, AlertTriangle, CalendarClock, Check, FlaskConical, Sparkles, Tablets, Thermometer } from "lucide-react-native";
import { Card, PrimaryButton } from "../components/UI";
import DatePickerField from "../components/DatePickerField";
import { ConditionLeavePrompt } from "../components/ConditionLeavePrompt";
import { colors, fonts } from "../theme/tokens";
import { addRecentActivity } from "../services/recentActivity";
import { scheduleMedicationReminder, scheduleThyroidLabReminder } from "../services/notifications";

const STORAGE_KEY = "remi_thyroid_tracking_plan";
const MED_REMINDER_ID = "thyroid-medication-daily";

type ThyroidPlan = {
  thyroidStatus: "Monitoring" | "Hypothyroid" | "Hyperthyroid";
  tsh: string;
  freeT4: string;
  freeT3: string;
  symptoms: string;
  medicationName: string;
  medicationTime: string;
  nextLabDate: string;
  followUpDate: string;
  medicationInstructions: string;
  notes: string;
};

const DEFAULT_PLAN: ThyroidPlan = {
  thyroidStatus: "Monitoring",
  tsh: "",
  freeT4: "",
  freeT3: "",
  symptoms: "",
  medicationName: "",
  medicationTime: "07:00",
  nextLabDate: "",
  followUpDate: "",
  medicationInstructions: "",
  notes: "",
};

export default function ThyroidTrackingScreen({ navigation }: any) {
  const [plan, setPlan] = useState<ThyroidPlan>(DEFAULT_PLAN);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(DEFAULT_PLAN));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [leavePromptVisible, setLeavePromptVisible] = useState(false);
  const leavingRef = useRef(false);
  const pendingLeaveRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      const loaded = { ...DEFAULT_PLAN, ...JSON.parse(stored) };
      setPlan(loaded);
      setSavedSnapshot(JSON.stringify(loaded));
    });
  }, []);

  useEffect(() => {
    return navigation.addListener("beforeRemove", (event: any) => {
      if (leavingRef.current) return;
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      confirmLeave(() => {
        leavingRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });
  }, [navigation, plan, savedSnapshot]);

  const update = (key: keyof ThyroidPlan, value: string) => {
    setSaved(false);
    setPlan((prev) => ({ ...prev, [key]: value }));
  };

  const cleanPlan = (value: ThyroidPlan) => ({
    ...value,
    tsh: value.tsh.trim(),
    freeT4: value.freeT4.trim(),
    freeT3: value.freeT3.trim(),
    symptoms: value.symptoms.trim(),
    medicationName: value.medicationName.trim(),
    medicationTime: value.medicationTime.trim(),
    nextLabDate: value.nextLabDate.trim(),
    followUpDate: value.followUpDate.trim(),
    medicationInstructions: value.medicationInstructions.trim(),
    notes: value.notes.trim(),
  });

  const hasUnsavedChanges = () => JSON.stringify(cleanPlan(plan)) !== savedSnapshot;

  const missingFields = (value: ThyroidPlan) => {
    const missing = [];
    if (!value.tsh) missing.push("TSH");
    if (!value.freeT4) missing.push("Free T4");
    if (!value.freeT3) missing.push("Free T3");
    if (!value.symptoms) missing.push("Symptoms");
    if (!value.medicationName) missing.push("Thyroid medication");
    if (!value.medicationTime) missing.push("Medication reminder time");
    if (!value.nextLabDate) missing.push("Next thyroid lab date");
    if (!value.followUpDate) missing.push("Follow-up appointment");
    if (!value.medicationInstructions) missing.push("Medication instructions");
    if (!value.notes) missing.push("Clinician notes");
    return missing;
  };

  const confirmLeave = (leave: () => void) => {
    pendingLeaveRef.current = leave;
    setLeavePromptVisible(true);
  };

  const continueEditing = () => {
    pendingLeaveRef.current = null;
    setLeavePromptVisible(false);
  };

  const cancelAndReturn = () => {
    const leave = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    setLeavePromptVisible(false);
    leave?.();
  };

  const backToConditions = () => {
    if (hasUnsavedChanges()) {
      confirmLeave(() => {
        leavingRef.current = true;
        navigation.goBack();
      });
      return;
    }
    navigation.goBack();
  };

  const save = async () => {
    const next = cleanPlan(plan);
    const missing = missingFields(next);
    if (missing.length) {
      Alert.alert("Complete your thyroid plan", `Please fill in: ${missing.join(", ")}.`);
      return;
    }

    setSaving(true);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
    await scheduleThyroidLabReminder(next.nextLabDate);

    const [hourStr, minuteStr] = next.medicationTime.split(":");
    const hour = Number(hourStr) || 7;
    const minute = Number(minuteStr) || 0;
    await scheduleMedicationReminder(MED_REMINDER_ID, hour, minute);

    await addRecentActivity({
      type: "lab",
      title: "Thyroid tracking updated",
      detail: next.tsh ? `Latest TSH: ${next.tsh}` : "Thyroid plan saved",
      route: "Conditions",
    });

    setPlan(next);
    setSavedSnapshot(JSON.stringify(next));
    setSaved(true);
    setSaving(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>THYROID</Text>
          <Text style={styles.title}>Track thyroid care</Text>
          <Text style={styles.subtitle}>Keep labs, symptoms, medication timing, and follow-up notes organized.</Text>
        </View>
        <View style={styles.headerIcon}>
          <Sparkles size={24} color={colors.peach} />
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.noticeCard}>
          <AlertTriangle size={17} color={colors.peach} />
          <Text style={styles.noticeText}>Seek urgent care for chest pain, fainting, severe confusion, extreme weakness, or a very fast irregular heartbeat.</Text>
        </Card>

        <Card style={styles.formCard}>
          <SectionTitle icon={<Activity size={16} color={colors.primary} />} title="Tracking status" />
          <Text style={styles.label}>Current thyroid focus</Text>
          <View style={styles.segmentRow}>
            {(["Monitoring", "Hypothyroid", "Hyperthyroid"] as const).map((status) => (
              <Pressable key={status} onPress={() => update("thyroidStatus", status)} style={[styles.segment, plan.thyroidStatus === status && styles.segmentActive]}>
                <Text style={[styles.segmentText, plan.thyroidStatus === status && styles.segmentTextActive]}>{status}</Text>
              </Pressable>
            ))}
          </View>

          <SectionTitle icon={<FlaskConical size={16} color={colors.primary} />} title="Latest thyroid labs" />
          <Input label="TSH" placeholder="e.g. 2.4" value={plan.tsh} onChangeText={(v) => update("tsh", v)} keyboardType="numbers-and-punctuation" />
          <View style={styles.grid}>
            <Input label="Free T4" placeholder="e.g. 1.1" value={plan.freeT4} onChangeText={(v) => update("freeT4", v)} keyboardType="numbers-and-punctuation" compact />
            <Input label="Free T3" placeholder="e.g. 3.2" value={plan.freeT3} onChangeText={(v) => update("freeT3", v)} keyboardType="numbers-and-punctuation" compact />
          </View>

          <SectionTitle icon={<Thermometer size={16} color={colors.primary} />} title="Symptoms" />
          <Input label="Symptoms to monitor" placeholder="Fatigue, palpitations, weight changes, heat/cold sensitivity..." value={plan.symptoms} onChangeText={(v) => update("symptoms", v)} multiline />

          <SectionTitle icon={<Tablets size={16} color={colors.primary} />} title="Medication support" />
          <Input label="Thyroid medication" placeholder="e.g. Levothyroxine 50mcg, carbimazole..." value={plan.medicationName} onChangeText={(v) => update("medicationName", v)} />
          <Input label="Medication reminder time" placeholder="07:00" value={plan.medicationTime} onChangeText={(v) => update("medicationTime", v)} keyboardType="numbers-and-punctuation" />
          <Input label="Medication instructions" placeholder="e.g. Take before breakfast, separate from iron/calcium..." value={plan.medicationInstructions} onChangeText={(v) => update("medicationInstructions", v)} multiline />

          <SectionTitle icon={<CalendarClock size={16} color={colors.primary} />} title="Follow-up" />
          <DatePickerField label="Next thyroid lab date" value={plan.nextLabDate} onChange={(v) => update("nextLabDate", v)} placeholder="Select next lab date" />
          <DatePickerField label="Follow-up appointment" value={plan.followUpDate} onChange={(v) => update("followUpDate", v)} placeholder="Select follow-up date" />
          <Input label="Clinician notes" placeholder="Targets, dose changes, questions, or next steps..." value={plan.notes} onChangeText={(v) => update("notes", v)} multiline />
        </Card>

        {saved ? (
          <View style={styles.savedBanner}>
            <Check size={15} color={colors.mint} />
            <Text style={styles.savedText}>Thyroid tracking plan saved.</Text>
          </View>
        ) : null}

        <PrimaryButton title={saving ? "Saving..." : "Save thyroid plan"} onPress={save} />
        <Pressable onPress={backToConditions} style={styles.backButton}>
          <Text style={styles.backText}>Back to conditions</Text>
        </Pressable>
      </View>
      <ConditionLeavePrompt
        visible={leavePromptVisible}
        title="Keep this thyroid plan?"
        message="You have started entering details. Continue editing to finish the plan, or cancel and return to Conditions without saving."
        onContinue={continueEditing}
        onCancel={cancelAndReturn}
      />
    </ScrollView>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  compact,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "numbers-and-punctuation";
  multiline?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.inputWrap, compact && { flex: 1 }]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 82, textAlignVertical: "top" }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 28, paddingTop: 56, paddingBottom: 20 },
  eyebrow: { color: colors.peach, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, maxWidth: 250 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 260 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.peachDim, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 28, gap: 12 },
  noticeCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, padding: 14 },
  noticeText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 10, flex: 1 },
  formCard: { padding: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  label: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, minHeight: 42, paddingHorizontal: 8 },
  segmentActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  segmentText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 11.5, textAlign: "center" },
  segmentTextActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  grid: { flexDirection: "row", gap: 10 },
  inputWrap: { marginBottom: 12 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, paddingHorizontal: 14, paddingVertical: 12 },
  savedBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 13 },
  savedText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 12, marginLeft: 8 },
  backButton: { alignItems: "center", paddingVertical: 14 },
  backText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
