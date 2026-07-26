import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Activity, AlertTriangle, Bell, Check, Wind } from "lucide-react-native";
import { Card, PrimaryButton } from "../components/UI";
import { colors, fonts } from "../theme/tokens";
import { addRecentActivity } from "../services/recentActivity";
import { scheduleMedicationReminder } from "../services/notifications";
import { ConditionLeavePrompt } from "../components/ConditionLeavePrompt";

const STORAGE_KEY = "remi_asthma_respiratory_plan";
const REMINDER_ID = "asthma-controller-daily";

type AsthmaPlan = {
  controllerMedication: string;
  rescueMedication: string;
  reminderTime: string;
  peakFlow: string;
  severity: "Mild" | "Moderate" | "Severe";
  triggers: string;
  actionPlanNotes: string;
};

const DEFAULT_PLAN: AsthmaPlan = {
  controllerMedication: "",
  rescueMedication: "",
  reminderTime: "08:00",
  peakFlow: "",
  severity: "Mild",
  triggers: "",
  actionPlanNotes: "",
};

export default function AsthmaRespiratoryScreen({ navigation }: any) {
  const [plan, setPlan] = useState<AsthmaPlan>(DEFAULT_PLAN);
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

  const update = (key: keyof AsthmaPlan, value: string) => {
    setSaved(false);
    setPlan((prev) => ({ ...prev, [key]: value }));
  };

  const cleanPlan = (value: AsthmaPlan) => ({
    ...value,
    controllerMedication: value.controllerMedication.trim(),
    rescueMedication: value.rescueMedication.trim(),
    reminderTime: value.reminderTime.trim(),
    peakFlow: value.peakFlow.trim(),
    triggers: value.triggers.trim(),
    actionPlanNotes: value.actionPlanNotes.trim(),
  });

  const hasUnsavedChanges = () => JSON.stringify(cleanPlan(plan)) !== savedSnapshot;

  const missingFields = (value: AsthmaPlan) => {
    const missing = [];
    if (!value.peakFlow) missing.push("Peak flow");
    if (!value.triggers) missing.push("Known triggers");
    if (!value.controllerMedication) missing.push("Controller medication");
    if (!value.rescueMedication) missing.push("Rescue inhaler");
    if (!value.reminderTime) missing.push("Controller reminder time");
    if (!value.actionPlanNotes) missing.push("Doctor instructions or red flags");
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
      Alert.alert("Complete your breathing plan", `Please fill in: ${missing.join(", ")}.`);
      return;
    }

    setSaving(true);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));

    const [hourStr, minuteStr] = next.reminderTime.split(":");
    const hour = Number(hourStr) || 8;
    const minute = Number(minuteStr) || 0;
    if (next.controllerMedication) await scheduleMedicationReminder(REMINDER_ID, hour, minute);

    await addRecentActivity({
      type: "lifestyle",
      title: "Asthma plan updated",
      detail: next.severity ? `${next.severity} symptoms tracked` : "Respiratory plan saved",
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
          <Text style={styles.eyebrow}>ASTHMA / RESPIRATORY</Text>
          <Text style={styles.title}>Build your breathing plan</Text>
          <Text style={styles.subtitle}>Track symptoms, triggers, inhalers, and peak flow so changes are easier to notice.</Text>
        </View>
        <View style={styles.headerIcon}>
          <Wind size={24} color={colors.peach} />
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.warningCard}>
          <AlertTriangle size={17} color={colors.peach} />
          <Text style={styles.warningText}>If breathing is severe, lips look blue, or a rescue inhaler is not helping, seek emergency care immediately.</Text>
        </Card>

        <Card style={styles.formCard}>
          <SectionTitle icon={<Wind size={16} color={colors.primary} />} title="Current symptoms" />
          <Text style={styles.label}>Severity today</Text>
          <View style={styles.segmentRow}>
            {(["Mild", "Moderate", "Severe"] as const).map((level) => (
              <Pressable key={level} onPress={() => update("severity", level)} style={[styles.segment, plan.severity === level && styles.segmentActive]}>
                <Text style={[styles.segmentText, plan.severity === level && styles.segmentTextActive]}>{level}</Text>
              </Pressable>
            ))}
          </View>
          <Input label="Peak flow" placeholder="e.g. 420" value={plan.peakFlow} onChangeText={(v) => update("peakFlow", v)} keyboardType="number-pad" />
          <Input label="Known triggers" placeholder="Dust, exercise, cold air, smoke..." value={plan.triggers} onChangeText={(v) => update("triggers", v)} multiline />

          <SectionTitle icon={<Activity size={16} color={colors.primary} />} title="Medication support" />
          <Input label="Controller medication" placeholder="e.g. Budesonide inhaler" value={plan.controllerMedication} onChangeText={(v) => update("controllerMedication", v)} />
          <Input label="Rescue inhaler" placeholder="e.g. Salbutamol / albuterol" value={plan.rescueMedication} onChangeText={(v) => update("rescueMedication", v)} />
          <Input label="Controller reminder time" placeholder="08:00" value={plan.reminderTime} onChangeText={(v) => update("reminderTime", v)} keyboardType="numbers-and-punctuation" />

          <SectionTitle icon={<Bell size={16} color={colors.primary} />} title="Action plan notes" />
          <Input label="Doctor instructions or red flags" placeholder="Add what your clinician told you to do..." value={plan.actionPlanNotes} onChangeText={(v) => update("actionPlanNotes", v)} multiline />
        </Card>

        {saved ? (
          <View style={styles.savedBanner}>
            <Check size={15} color={colors.mint} />
            <Text style={styles.savedText}>Asthma/respiratory plan saved.</Text>
          </View>
        ) : null}

        <PrimaryButton title={saving ? "Saving..." : "Save breathing plan"} onPress={save} />
        <Pressable onPress={backToConditions} style={styles.backButton}>
          <Text style={styles.backText}>Back to conditions</Text>
        </Pressable>
      </View>
      <ConditionLeavePrompt
        visible={leavePromptVisible}
        title="Keep this breathing plan?"
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "numbers-and-punctuation";
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
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
  warningCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, padding: 14 },
  warningText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 10, flex: 1 },
  formCard: { padding: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  label: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  segmentRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  segment: { flex: 1, alignItems: "center", backgroundColor: colors.bg, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingVertical: 10 },
  segmentActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  segmentText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 12 },
  segmentTextActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  inputWrap: { marginBottom: 12 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, paddingHorizontal: 14, paddingVertical: 12 },
  savedBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 13 },
  savedText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 12, marginLeft: 8 },
  backButton: { alignItems: "center", paddingVertical: 14 },
  backText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
