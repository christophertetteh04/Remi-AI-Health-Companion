import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AlertTriangle, CalendarClock, Check, Droplets, FlaskConical, HeartPulse, Stethoscope } from "lucide-react-native";
import { Card, PrimaryButton } from "../components/UI";
import { colors, fonts } from "../theme/tokens";
import { addRecentActivity } from "../services/recentActivity";
import { scheduleKidneyLabReminder } from "../services/notifications";
import { ConditionLeavePrompt } from "../components/ConditionLeavePrompt";

const STORAGE_KEY = "remi_kidney_function_plan";

type KidneyPlan = {
  stage: "Monitoring" | "At risk" | "CKD diagnosed";
  egfr: string;
  creatinine: string;
  urineAcr: string;
  bloodPressure: string;
  diabetesStatus: string;
  nextLabDate: string;
  nephrologyDate: string;
  fluidGuidance: string;
  notes: string;
};

const DEFAULT_PLAN: KidneyPlan = {
  stage: "Monitoring",
  egfr: "",
  creatinine: "",
  urineAcr: "",
  bloodPressure: "",
  diabetesStatus: "",
  nextLabDate: "",
  nephrologyDate: "",
  fluidGuidance: "",
  notes: "",
};

export default function KidneyFunctionScreen({ navigation }: any) {
  const [plan, setPlan] = useState<KidneyPlan>(DEFAULT_PLAN);
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

  const update = (key: keyof KidneyPlan, value: string) => {
    setSaved(false);
    setPlan((prev) => ({ ...prev, [key]: value }));
  };

  const cleanPlan = (value: KidneyPlan) => ({
    ...value,
    egfr: value.egfr.trim(),
    creatinine: value.creatinine.trim(),
    urineAcr: value.urineAcr.trim(),
    bloodPressure: value.bloodPressure.trim(),
    diabetesStatus: value.diabetesStatus.trim(),
    nextLabDate: value.nextLabDate.trim(),
    nephrologyDate: value.nephrologyDate.trim(),
    fluidGuidance: value.fluidGuidance.trim(),
    notes: value.notes.trim(),
  });

  const hasUnsavedChanges = () => JSON.stringify(cleanPlan(plan)) !== savedSnapshot;

  const missingFields = (value: KidneyPlan) => {
    const missing = [];
    if (!value.egfr) missing.push("eGFR");
    if (!value.creatinine) missing.push("Creatinine");
    if (!value.urineAcr) missing.push("Urine ACR / protein");
    if (!value.bloodPressure) missing.push("Blood pressure");
    if (!value.diabetesStatus) missing.push("Diabetes or glucose notes");
    if (!value.nextLabDate) missing.push("Next kidney lab date");
    if (!value.nephrologyDate) missing.push("Next nephrology or clinic visit");
    if (!value.fluidGuidance) missing.push("Fluid or diet guidance");
    if (!value.notes) missing.push("Notes for next visit");
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
      Alert.alert("Complete your kidney plan", `Please fill in: ${missing.join(", ")}.`);
      return;
    }

    setSaving(true);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
    if (next.nextLabDate) await scheduleKidneyLabReminder(next.nextLabDate);

    await addRecentActivity({
      type: "lab",
      title: "Kidney tracking updated",
      detail: next.egfr ? `Latest eGFR: ${next.egfr}` : "Kidney function plan saved",
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
          <Text style={styles.eyebrow}>KIDNEY FUNCTION</Text>
          <Text style={styles.title}>Track labs and follow-up</Text>
          <Text style={styles.subtitle}>Keep kidney labs, blood pressure context, care dates, and clinician notes in one place.</Text>
        </View>
        <View style={styles.headerIcon}>
          <Stethoscope size={24} color={colors.primary} />
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.noticeCard}>
          <AlertTriangle size={17} color={colors.primary} />
          <Text style={styles.noticeText}>Seek urgent care for severe swelling, trouble breathing, confusion, chest pain, or very low urine output.</Text>
        </Card>

        <Card style={styles.formCard}>
          <SectionTitle icon={<HeartPulse size={16} color={colors.primary} />} title="Tracking status" />
          <Text style={styles.label}>Current status</Text>
          <View style={styles.segmentRow}>
            {(["Monitoring", "At risk", "CKD diagnosed"] as const).map((stage) => (
              <Pressable key={stage} onPress={() => update("stage", stage)} style={[styles.segment, plan.stage === stage && styles.segmentActive]}>
                <Text style={[styles.segmentText, plan.stage === stage && styles.segmentTextActive]}>{stage}</Text>
              </Pressable>
            ))}
          </View>

          <SectionTitle icon={<FlaskConical size={16} color={colors.primary} />} title="Latest kidney labs" />
          <View style={styles.grid}>
            <Input label="eGFR" placeholder="e.g. 82" value={plan.egfr} onChangeText={(v) => update("egfr", v)} keyboardType="number-pad" compact />
            <Input label="Creatinine" placeholder="e.g. 0.9" value={plan.creatinine} onChangeText={(v) => update("creatinine", v)} keyboardType="decimal-pad" compact />
          </View>
          <Input label="Urine ACR / protein" placeholder="e.g. Normal, 22 mg/g, trace protein" value={plan.urineAcr} onChangeText={(v) => update("urineAcr", v)} />

          <SectionTitle icon={<HeartPulse size={16} color={colors.primary} />} title="Risk factors" />
          <Input label="Blood pressure" placeholder="e.g. 124/78" value={plan.bloodPressure} onChangeText={(v) => update("bloodPressure", v)} keyboardType="numbers-and-punctuation" />
          <Input label="Diabetes or glucose notes" placeholder="e.g. No diabetes, A1C 6.4, fasting glucose..." value={plan.diabetesStatus} onChangeText={(v) => update("diabetesStatus", v)} />

          <SectionTitle icon={<CalendarClock size={16} color={colors.primary} />} title="Care schedule" />
          <Input label="Next kidney lab date" placeholder="YYYY-MM-DD" value={plan.nextLabDate} onChangeText={(v) => update("nextLabDate", v)} keyboardType="numbers-and-punctuation" />
          <Input label="Next nephrology or clinic visit" placeholder="YYYY-MM-DD or appointment note" value={plan.nephrologyDate} onChangeText={(v) => update("nephrologyDate", v)} />

          <SectionTitle icon={<Droplets size={16} color={colors.primary} />} title="Clinician guidance" />
          <Input label="Fluid or diet guidance" placeholder="Add any fluid, salt, potassium, or protein guidance..." value={plan.fluidGuidance} onChangeText={(v) => update("fluidGuidance", v)} multiline />
          <Input label="Notes for next visit" placeholder="Questions, medication concerns, symptoms to mention..." value={plan.notes} onChangeText={(v) => update("notes", v)} multiline />
        </Card>

        {saved ? (
          <View style={styles.savedBanner}>
            <Check size={15} color={colors.mint} />
            <Text style={styles.savedText}>Kidney function plan saved.</Text>
          </View>
        ) : null}

        <PrimaryButton title={saving ? "Saving..." : "Save kidney plan"} onPress={save} />
        <Pressable onPress={backToConditions} style={styles.backButton}>
          <Text style={styles.backText}>Back to conditions</Text>
        </Pressable>
      </View>
      <ConditionLeavePrompt
        visible={leavePromptVisible}
        title="Keep this kidney plan?"
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
  keyboardType?: "default" | "number-pad" | "decimal-pad" | "numbers-and-punctuation";
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
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, maxWidth: 250 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 260 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 28, gap: 12 },
  noticeCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.primaryDim, padding: 14 },
  noticeText: { color: colors.primary, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 10, flex: 1 },
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
