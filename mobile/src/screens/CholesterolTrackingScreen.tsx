import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Activity, AlertTriangle, CalendarClock, Check, FlaskConical, HeartPulse, Salad, Tablets } from "lucide-react-native";
import { Card, PrimaryButton } from "../components/UI";
import DatePickerField from "../components/DatePickerField";
import { ConditionLeavePrompt } from "../components/ConditionLeavePrompt";
import { colors, fonts } from "../theme/tokens";
import { addRecentActivity } from "../services/recentActivity";
import { scheduleCholesterolLabReminder, scheduleMedicationReminder } from "../services/notifications";

const STORAGE_KEY = "remi_cholesterol_tracking_plan";
const MED_REMINDER_ID = "cholesterol-medication-daily";

type CholesterolPlan = {
  riskLevel: "Monitoring" | "Borderline" | "High";
  totalCholesterol: string;
  ldl: string;
  hdl: string;
  triglycerides: string;
  bloodPressure: string;
  medicationName: string;
  medicationTime: string;
  nextLipidTestDate: string;
  nutritionGoal: string;
  activityGoal: string;
  notes: string;
};

const DEFAULT_PLAN: CholesterolPlan = {
  riskLevel: "Monitoring",
  totalCholesterol: "",
  ldl: "",
  hdl: "",
  triglycerides: "",
  bloodPressure: "",
  medicationName: "",
  medicationTime: "20:00",
  nextLipidTestDate: "",
  nutritionGoal: "",
  activityGoal: "",
  notes: "",
};

export default function CholesterolTrackingScreen({ navigation }: any) {
  const [plan, setPlan] = useState<CholesterolPlan>(DEFAULT_PLAN);
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

  const update = (key: keyof CholesterolPlan, value: string) => {
    setSaved(false);
    setPlan((prev) => ({ ...prev, [key]: value }));
  };

  const cleanPlan = (value: CholesterolPlan) => ({
    ...value,
    totalCholesterol: value.totalCholesterol.trim(),
    ldl: value.ldl.trim(),
    hdl: value.hdl.trim(),
    triglycerides: value.triglycerides.trim(),
    bloodPressure: value.bloodPressure.trim(),
    medicationName: value.medicationName.trim(),
    medicationTime: value.medicationTime.trim(),
    nextLipidTestDate: value.nextLipidTestDate.trim(),
    nutritionGoal: value.nutritionGoal.trim(),
    activityGoal: value.activityGoal.trim(),
    notes: value.notes.trim(),
  });

  const hasUnsavedChanges = () => JSON.stringify(cleanPlan(plan)) !== savedSnapshot;

  const missingFields = (value: CholesterolPlan) => {
    const missing = [];
    if (!value.totalCholesterol) missing.push("Total cholesterol");
    if (!value.ldl) missing.push("LDL");
    if (!value.hdl) missing.push("HDL");
    if (!value.triglycerides) missing.push("Triglycerides");
    if (!value.bloodPressure) missing.push("Blood pressure");
    if (!value.nextLipidTestDate) missing.push("Next lipid test date");
    if (!value.nutritionGoal) missing.push("Nutrition goal");
    if (!value.activityGoal) missing.push("Activity goal");
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
      Alert.alert("Complete your cholesterol plan", `Please fill in: ${missing.join(", ")}.`);
      return;
    }

    setSaving(true);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
    await scheduleCholesterolLabReminder(next.nextLipidTestDate);

    if (next.medicationName) {
      const [hourStr, minuteStr] = next.medicationTime.split(":");
      const hour = Number(hourStr) || 20;
      const minute = Number(minuteStr) || 0;
      await scheduleMedicationReminder(MED_REMINDER_ID, hour, minute);
    }

    await addRecentActivity({
      type: "lab",
      title: "Cholesterol tracking updated",
      detail: next.ldl ? `Latest LDL: ${next.ldl}` : "Lipid plan saved",
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
          <Text style={styles.eyebrow}>CHOLESTEROL</Text>
          <Text style={styles.title}>Track your heart numbers</Text>
          <Text style={styles.subtitle}>Save lipid results, medication support, lifestyle goals, and follow-up dates.</Text>
        </View>
        <View style={styles.headerIcon}>
          <HeartPulse size={24} color={colors.urgent} />
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.noticeCard}>
          <AlertTriangle size={17} color={colors.urgent} />
          <Text style={styles.noticeText}>Seek urgent care for chest pain, fainting, severe shortness of breath, or stroke-like symptoms.</Text>
        </Card>

        <Card style={styles.formCard}>
          <SectionTitle icon={<Activity size={16} color={colors.primary} />} title="Risk status" />
          <Text style={styles.label}>Current focus</Text>
          <View style={styles.segmentRow}>
            {(["Monitoring", "Borderline", "High"] as const).map((level) => (
              <Pressable key={level} onPress={() => update("riskLevel", level)} style={[styles.segment, plan.riskLevel === level && styles.segmentActive]}>
                <Text style={[styles.segmentText, plan.riskLevel === level && styles.segmentTextActive]}>{level}</Text>
              </Pressable>
            ))}
          </View>

          <SectionTitle icon={<FlaskConical size={16} color={colors.primary} />} title="Latest lipid panel" />
          <View style={styles.grid}>
            <Input label="Total" placeholder="e.g. 185" value={plan.totalCholesterol} onChangeText={(v) => update("totalCholesterol", v)} keyboardType="number-pad" compact />
            <Input label="LDL" placeholder="e.g. 105" value={plan.ldl} onChangeText={(v) => update("ldl", v)} keyboardType="number-pad" compact />
          </View>
          <View style={styles.grid}>
            <Input label="HDL" placeholder="e.g. 52" value={plan.hdl} onChangeText={(v) => update("hdl", v)} keyboardType="number-pad" compact />
            <Input label="Triglycerides" placeholder="e.g. 130" value={plan.triglycerides} onChangeText={(v) => update("triglycerides", v)} keyboardType="number-pad" compact />
          </View>
          <Input label="Blood pressure" placeholder="e.g. 122/76" value={plan.bloodPressure} onChangeText={(v) => update("bloodPressure", v)} keyboardType="numbers-and-punctuation" />

          <SectionTitle icon={<Tablets size={16} color={colors.primary} />} title="Medication support" />
          <Input label="Cholesterol medication" placeholder="e.g. Atorvastatin 20mg, or none" value={plan.medicationName} onChangeText={(v) => update("medicationName", v)} />
          <Input label="Medication reminder time" placeholder="20:00" value={plan.medicationTime} onChangeText={(v) => update("medicationTime", v)} keyboardType="numbers-and-punctuation" />

          <SectionTitle icon={<CalendarClock size={16} color={colors.primary} />} title="Follow-up" />
          <DatePickerField label="Next lipid test date" value={plan.nextLipidTestDate} onChange={(v) => update("nextLipidTestDate", v)} placeholder="Select next lipid test date" />

          <SectionTitle icon={<Salad size={16} color={colors.primary} />} title="Lifestyle plan" />
          <Input label="Nutrition goal" placeholder="e.g. More fiber, reduce fried foods, limit trans fats..." value={plan.nutritionGoal} onChangeText={(v) => update("nutritionGoal", v)} multiline />
          <Input label="Activity goal" placeholder="e.g. 30 minute walk, 5 days weekly" value={plan.activityGoal} onChangeText={(v) => update("activityGoal", v)} multiline />
          <Input label="Clinician notes" placeholder="Targets, questions, family history, or next steps..." value={plan.notes} onChangeText={(v) => update("notes", v)} multiline />
        </Card>

        {saved ? (
          <View style={styles.savedBanner}>
            <Check size={15} color={colors.mint} />
            <Text style={styles.savedText}>Cholesterol tracking plan saved.</Text>
          </View>
        ) : null}

        <PrimaryButton title={saving ? "Saving..." : "Save cholesterol plan"} onPress={save} />
        <Pressable onPress={backToConditions} style={styles.backButton}>
          <Text style={styles.backText}>Back to conditions</Text>
        </Pressable>
      </View>
      <ConditionLeavePrompt
        visible={leavePromptVisible}
        title="Keep this cholesterol plan?"
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
  keyboardType?: "default" | "number-pad" | "numbers-and-punctuation";
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
  eyebrow: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, maxWidth: 250 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 260 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.urgentDim, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 28, gap: 12 },
  noticeCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.urgentDim, padding: 14 },
  noticeText: { color: colors.urgent, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 10, flex: 1 },
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
