import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ArrowLeft, BellRing, CalendarCheck, Check, Eye, HeartPulse, ShieldCheck, Smile } from "lucide-react-native";
import { PrimaryButton } from "../components/UI";
import { colors, fonts, spacing } from "../theme/tokens";
import {
  DEFAULT_PREVENTIVE_CARE_INTERVAL_MONTHS,
  DEFAULT_PREVENTIVE_CARE_TYPES,
  PREVENTIVE_CARE_ENABLED_KEY,
  PREVENTIVE_CARE_INTERVAL_KEY,
  PREVENTIVE_CARE_TYPES_KEY,
  cancelPreventiveCareReminders,
  schedulePreventiveCareReminders,
} from "../services/notifications";

const careTypes = [
  { id: "dental", title: "Dental check", detail: "Cleaning, oral health review, or dental follow-up.", icon: <Smile size={17} color={colors.primary} /> },
  { id: "vision", title: "Vision check", detail: "Eye exam, prescription update, or vision screening.", icon: <Eye size={17} color={colors.primary} /> },
  { id: "general", title: "General check-up", detail: "Routine wellness visit or primary-care review.", icon: <HeartPulse size={17} color={colors.primary} /> },
];

const intervals = [
  { label: "Every 3 months", value: 3 },
  { label: "Every 6 months", value: 6 },
  { label: "Every 12 months", value: 12 },
];

export default function PreventiveReminderSettingsScreen({ navigation }: any) {
  const [enabled, setEnabled] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(DEFAULT_PREVENTIVE_CARE_TYPES);
  const [intervalMonths, setIntervalMonths] = useState(DEFAULT_PREVENTIVE_CARE_INTERVAL_MONTHS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedEnabled, storedTypes, storedInterval] = await Promise.all([
        SecureStore.getItemAsync(PREVENTIVE_CARE_ENABLED_KEY),
        SecureStore.getItemAsync(PREVENTIVE_CARE_TYPES_KEY),
        SecureStore.getItemAsync(PREVENTIVE_CARE_INTERVAL_KEY),
      ]);
      setEnabled(storedEnabled === "true");
      if (storedTypes) setSelectedTypes(JSON.parse(storedTypes));
      const parsedInterval = Number(storedInterval);
      if (Number.isFinite(parsedInterval) && parsedInterval > 0) setIntervalMonths(parsedInterval);
    })();
  }, []);

  const toggleCareType = async (id: string) => {
    const next = selectedTypes.includes(id) ? selectedTypes.filter((type) => type !== id) : [...selectedTypes, id];
    setSelectedTypes(next);
    await SecureStore.setItemAsync(PREVENTIVE_CARE_TYPES_KEY, JSON.stringify(next));
  };

  const chooseInterval = async (value: number) => {
    setIntervalMonths(value);
    await SecureStore.setItemAsync(PREVENTIVE_CARE_INTERVAL_KEY, String(value));
  };

  const applySettings = async (nextEnabled = enabled) => {
    if (nextEnabled && selectedTypes.length === 0) {
      Alert.alert("Choose at least one reminder", "Select dental, vision, or general check-up before turning on preventive care reminders.");
      setEnabled(false);
      await SecureStore.deleteItemAsync(PREVENTIVE_CARE_ENABLED_KEY);
      return;
    }

    setSaving(true);
    try {
      if (nextEnabled) {
        await schedulePreventiveCareReminders({ types: selectedTypes, intervalMonths });
        setEnabled(true);
      } else {
        await cancelPreventiveCareReminders();
        setEnabled(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (value: boolean) => {
    setEnabled(value);
    await applySettings(value);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <CalendarCheck size={13} color={colors.primary} />
          <Text style={styles.badgeText}>{enabled ? "On" : "Off"}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <BellRing size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>PREVENTIVE CARE</Text>
        <Text style={styles.title}>Plan the checks that are easy to forget.</Text>
        <Text style={styles.subtitle}>Choose routine care reminders Remi should schedule. These are planning nudges, not medical advice.</Text>
      </View>

      <View style={styles.controlCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.controlTitle}>Preventive care reminders</Text>
          <Text style={styles.controlText}>{enabled ? `${selectedTypes.length} reminder type${selectedTypes.length === 1 ? "" : "s"} selected` : "Turn on routine dental, vision, or check-up nudges."}</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggleEnabled}
          disabled={saving}
          trackColor={{ false: colors.surfaceRaised, true: colors.primaryDim }}
          thumbColor={enabled ? colors.primary : colors.inkFaint}
          ios_backgroundColor={colors.surfaceRaised}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>REMINDER TYPES</Text>
        {careTypes.map((type) => {
          const active = selectedTypes.includes(type.id);
          return (
            <Pressable key={type.id} onPress={() => toggleCareType(type.id)} style={[styles.optionRow, active && styles.optionActive]}>
              <View style={styles.optionIcon}>{type.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{type.title}</Text>
                <Text style={styles.optionText}>{type.detail}</Text>
              </View>
              <View style={[styles.checkBox, active && styles.checkBoxActive]}>{active ? <Check size={13} color={colors.bg} /> : null}</View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>REMIND ME</Text>
        {intervals.map((option) => {
          const active = intervalMonths === option.value;
          return (
            <Pressable key={option.value} onPress={() => chooseInterval(option.value)} style={[styles.intervalRow, active && styles.optionActive]}>
              <Text style={styles.intervalText}>{option.label}</Text>
              <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.note}>
        <ShieldCheck size={15} color={colors.mint} />
        <Text style={styles.noteText}>Remi schedules routine reminders only. Your clinician may recommend a different timing based on your care plan.</Text>
      </View>

      <PrimaryButton title={saving ? "Saving..." : "Save reminder choices"} onPress={() => applySettings(enabled)} style={{ opacity: saving ? 0.62 : 1 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: 34 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  controlCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16, marginBottom: 12 },
  controlTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  controlText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 4, paddingRight: 12 },
  section: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingTop: 14, marginBottom: 12, overflow: "hidden" },
  sectionLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginHorizontal: 16, marginBottom: 2 },
  optionRow: { minHeight: 70, flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  optionActive: { backgroundColor: colors.primaryDim },
  optionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", marginRight: 12 },
  optionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  optionText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  checkBox: { width: 23, height: 23, borderRadius: 8, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  checkBoxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  intervalRow: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  intervalText: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  note: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14, marginBottom: 14 },
  noteText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
