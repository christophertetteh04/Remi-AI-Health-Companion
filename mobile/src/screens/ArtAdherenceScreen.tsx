import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Bell, CalendarClock, Check, Pill, ShieldCheck } from "lucide-react-native";
import { Card, PrimaryButton } from "../components/UI";
import { colors, fonts } from "../theme/tokens";
import { addRecentActivity } from "../services/recentActivity";
import { scheduleMedicationReminder } from "../services/notifications";
import { ConditionLeavePrompt } from "../components/ConditionLeavePrompt";

const STORAGE_KEY = "remi_art_adherence_plan";
const REMINDER_ID = "art-adherence-daily";

type ArtPlan = {
  medicationName: string;
  dose: string;
  reminderTime: string;
  clinicDate: string;
  notes: string;
  privacyMode: boolean;
};

const DEFAULT_PLAN: ArtPlan = {
  medicationName: "",
  dose: "",
  reminderTime: "08:00",
  clinicDate: "",
  notes: "",
  privacyMode: true,
};

export default function ArtAdherenceScreen({ navigation }: any) {
  const [plan, setPlan] = useState<ArtPlan>(DEFAULT_PLAN);
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

  const update = (key: keyof ArtPlan, value: string | boolean) => {
    setSaved(false);
    setPlan((prev) => ({ ...prev, [key]: value }));
  };

  const cleanPlan = (value: ArtPlan) => ({
    ...value,
    medicationName: value.medicationName.trim(),
    dose: value.dose.trim(),
    reminderTime: value.reminderTime.trim(),
    clinicDate: value.clinicDate.trim(),
    notes: value.notes.trim(),
  });

  const hasUnsavedChanges = () => JSON.stringify(cleanPlan(plan)) !== savedSnapshot;

  const missingFields = (value: ArtPlan) => {
    const missing = [];
    if (!value.medicationName) missing.push("ART medication name");
    if (!value.dose) missing.push("Dose");
    if (!value.reminderTime) missing.push("Daily reminder time");
    if (!value.clinicDate) missing.push("Next clinic or refill date");
    if (!value.notes) missing.push("Private notes");
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
      Alert.alert("Complete your ART plan", `Please fill in: ${missing.join(", ")}.`);
      return;
    }

    setSaving(true);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));

    const [hourStr, minuteStr] = next.reminderTime.split(":");
    const hour = Number(hourStr) || 8;
    const minute = Number(minuteStr) || 0;
    await scheduleMedicationReminder(REMINDER_ID, hour, minute);
    await addRecentActivity({
      type: "medication",
      title: "ART adherence plan updated",
      detail: next.medicationName || "Daily ART reminder configured",
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
          <Text style={styles.eyebrow}>HIV / ART ADHERENCE</Text>
          <Text style={styles.title}>Set up your ART plan</Text>
          <Text style={styles.subtitle}>Create private reminders and keep appointment notes easy to find.</Text>
        </View>
        <View style={styles.headerIcon}>
          <ShieldCheck size={24} color={colors.mint} />
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.noticeCard}>
          <ShieldCheck size={17} color={colors.mint} />
          <Text style={styles.noticeText}>Remi supports adherence tracking, but it does not replace care from your HIV clinician.</Text>
        </Card>

        <Card style={styles.formCard}>
          <SectionTitle icon={<Pill size={16} color={colors.primary} />} title="Medication" />
          <Input label="ART medication name" placeholder="e.g. TLD, Biktarvy" value={plan.medicationName} onChangeText={(v) => update("medicationName", v)} />
          <Input label="Dose" placeholder="e.g. 1 tablet daily" value={plan.dose} onChangeText={(v) => update("dose", v)} />

          <SectionTitle icon={<Bell size={16} color={colors.primary} />} title="Reminder" />
          <Input label="Daily reminder time" placeholder="08:00" value={plan.reminderTime} onChangeText={(v) => update("reminderTime", v)} keyboardType="numbers-and-punctuation" />

          <SectionTitle icon={<CalendarClock size={16} color={colors.primary} />} title="Follow-up" />
          <Input label="Next clinic or refill date" placeholder="YYYY-MM-DD" value={plan.clinicDate} onChangeText={(v) => update("clinicDate", v)} />
          <Input label="Private notes" placeholder="Anything to remember for your visit" value={plan.notes} onChangeText={(v) => update("notes", v)} multiline />

          <Pressable onPress={() => update("privacyMode", !plan.privacyMode)} style={styles.checkRow}>
            <View style={[styles.checkbox, plan.privacyMode && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              {plan.privacyMode && <Check size={12} color={colors.bg} />}
            </View>
            <Text style={styles.checkText}>Use discreet reminder wording on notifications</Text>
          </Pressable>
        </Card>

        {saved ? (
          <View style={styles.savedBanner}>
            <Check size={15} color={colors.mint} />
            <Text style={styles.savedText}>ART adherence plan saved.</Text>
          </View>
        ) : null}

        <PrimaryButton title={saving ? "Saving..." : "Save ART plan"} onPress={save} />
        <Pressable onPress={backToConditions} style={styles.backButton}>
          <Text style={styles.backText}>Back to conditions</Text>
        </Pressable>
      </View>
      <ConditionLeavePrompt
        visible={leavePromptVisible}
        title="Keep this ART plan?"
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
  keyboardType?: "default" | "numbers-and-punctuation";
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
  eyebrow: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, maxWidth: 250 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 260 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.mintDim, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 28, gap: 12 },
  noticeCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.mintDim, padding: 14 },
  noticeText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 10, flex: 1 },
  formCard: { padding: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  inputWrap: { marginBottom: 12 },
  label: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, paddingHorizontal: 14, paddingVertical: 12 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 7, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkText: { color: colors.ink, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, flex: 1 },
  savedBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 13 },
  savedText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 12, marginLeft: 8 },
  backButton: { alignItems: "center", paddingVertical: 14 },
  backText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
