import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Bell, CalendarCheck, Check, HeartPulse, ShieldCheck, Sparkles, Stethoscope } from "lucide-react-native";
import { Card, PrimaryButton } from "../components/UI";
import DatePickerField from "../components/DatePickerField";
import {
  cancelDentalVisionReminder,
  scheduleAnnualCheckupReminder,
  scheduleDentalVisionReminder,
} from "../services/notifications";
import { colors, fonts } from "../theme/tokens";

function screeningPrompts(age: number): string[] {
  const prompts: string[] = [];
  if (age >= 21) prompts.push("Ask your clinician whether cervical screening is right for you.");
  if (age >= 40) prompts.push("Ask about breast or prostate screening timing based on your personal risk.");
  if (age >= 45) prompts.push("Ask whether colorectal screening should be part of your next visit.");
  if (prompts.length === 0) prompts.push("No age-based screening prompts yet. Your clinician can personalize what matters now.");
  return prompts;
}

export default function PreventiveCareScreen() {
  const [lastVisit, setLastVisit] = useState("");
  const [checkupSet, setCheckupSet] = useState(false);
  const [dentalOn, setDentalOn] = useState(false);
  const [age, setAge] = useState("");

  const setCheckupReminder = async () => {
    if (!lastVisit.trim()) {
      Alert.alert("Add last visit date", "Enter your last general check-up date before setting a reminder.");
      return;
    }

    await scheduleAnnualCheckupReminder(lastVisit.trim());
    setCheckupSet(true);
  };

  const toggleDental = async () => {
    if (dentalOn) {
      await cancelDentalVisionReminder();
      setDentalOn(false);
    } else {
      await scheduleDentalVisionReminder();
      setDentalOn(true);
    }
  };

  const ageNumber = Number(age);
  const prompts = age && ageNumber > 0 ? screeningPrompts(ageNumber) : [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>PREVENTIVE CARE</Text>
          <Text style={styles.title}>Stay ahead of routine care</Text>
          <Text style={styles.subtitle}>Set simple check-up reminders and prepare better questions for your next visit.</Text>
        </View>
        <View style={styles.headerIcon}>
          <CalendarCheck size={24} color={colors.primary} />
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <ShieldCheck size={18} color={colors.mint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Care planning</Text>
            <Text style={styles.summaryTitle}>Gentle reminders, clinician-led decisions</Text>
            <Text style={styles.summaryText}>Remi gives broad prompts only. Your doctor should guide screening timing and risk decisions.</Text>
          </View>
        </Card>

        <Card style={styles.formCard}>
          <SectionTitle icon={<Stethoscope size={16} color={colors.primary} />} title="Annual check-up" />
          <DatePickerField label="Last general check-up" value={lastVisit} onChange={setLastVisit} placeholder="Select last visit date" />
          <PrimaryButton title={checkupSet ? "Annual reminder set" : "Set annual reminder"} onPress={setCheckupReminder} />
          {checkupSet ? (
            <View style={styles.savedBanner}>
              <Check size={15} color={colors.mint} />
              <Text style={styles.savedText}>Remi will remind you around your next annual check-up.</Text>
            </View>
          ) : null}
        </Card>

        <Card style={styles.formCard}>
          <SectionTitle icon={<ShieldCheck size={16} color={colors.primary} />} title="Dental and vision" />
          <Pressable onPress={toggleDental} style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Six-month reminder</Text>
              <Text style={styles.toggleSubtitle}>Helpful for dental cleaning, eye checks, and routine follow-ups.</Text>
            </View>
            <View style={[styles.switchTrack, dentalOn && styles.switchTrackActive]}>
              <View style={[styles.switchKnob, dentalOn && styles.switchKnobActive]} />
            </View>
          </Pressable>
        </Card>

        <Card style={styles.formCard}>
          <SectionTitle icon={<Bell size={16} color={colors.primary} />} title="Screening prompts" />
          <Input label="Age" value={age} onChangeText={setAge} placeholder="Enter age" keyboardType="number-pad" />
          <View style={styles.promptList}>
            {prompts.length ? (
              prompts.map((prompt, index) => (
                <View key={`${prompt}-${index}`} style={styles.promptCard}>
                  <View style={styles.promptIcon}>
                    <HeartPulse size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.promptText}>{prompt}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyPrompt}>
                <Sparkles size={15} color={colors.inkFaint} />
                <Text style={styles.emptyPromptText}>Enter your age to see general screening conversation prompts.</Text>
              </View>
            )}
          </View>
        </Card>
      </View>
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "numbers-and-punctuation";
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
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 28, paddingTop: 56, paddingBottom: 20 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, maxWidth: 250 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 270 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 28, gap: 12 },
  summaryCard: { flexDirection: "row", alignItems: "flex-start", padding: 16 },
  summaryIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.mintDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryLabel: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  summaryTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15, marginTop: 3 },
  summaryText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  formCard: { padding: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  inputWrap: { marginBottom: 12 },
  label: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, paddingHorizontal: 14, paddingVertical: 12 },
  savedBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 12, marginTop: 12 },
  savedText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 17, marginLeft: 8, flex: 1 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14 },
  toggleTextWrap: { flex: 1, paddingRight: 12 },
  toggleTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  toggleSubtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  switchTrack: { width: 46, height: 26, borderRadius: 999, backgroundColor: colors.surfaceRaised, justifyContent: "center", paddingHorizontal: 3 },
  switchTrackActive: { backgroundColor: colors.primary },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface },
  switchKnobActive: { alignSelf: "flex-end" },
  promptList: { gap: 10 },
  promptCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 13 },
  promptIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 10 },
  promptText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, flex: 1 },
  emptyPrompt: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14 },
  emptyPromptText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginLeft: 8, flex: 1 },
});
