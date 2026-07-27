import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Activity, ArrowLeft, BellRing, Check, Clock3, HeartPulse, MessageCircle, Pill, ShieldCheck } from "lucide-react-native";
import { PrimaryButton } from "../components/UI";
import { colors, fonts, spacing } from "../theme/tokens";
import {
  DEFAULT_HEALTH_REMINDER_DAY,
  DEFAULT_HEALTH_REMINDER_TIME,
  DEFAULT_HEALTH_REMINDER_TYPES,
  HEALTH_REMINDERS_ENABLED_KEY,
  HEALTH_REMINDER_DAY_KEY,
  HEALTH_REMINDER_TIME_KEY,
  HEALTH_REMINDER_TYPES_KEY,
  cancelHealthReminders,
  scheduleHealthReminders,
} from "../services/notifications";

const reminderTypes = [
  { id: "vitals", title: "Vitals check-in", detail: "A weekly nudge to log blood pressure, glucose, or key readings.", icon: <Activity size={17} color={colors.primary} /> },
  { id: "checkin", title: "Health check-in", detail: "A reminder to tell Remi how you are feeling.", icon: <MessageCircle size={17} color={colors.primary} /> },
  { id: "medication_review", title: "Medication review", detail: "A weekly prompt to review your medication list and reminders.", icon: <Pill size={17} color={colors.primary} /> },
];

const dayOptions = [
  { label: "Monday", value: 1 },
  { label: "Wednesday", value: 3 },
  { label: "Friday", value: 5 },
  { label: "Sunday", value: 7 },
];

const timeOptions = [
  { label: "Morning", detail: "9:00 AM", value: "09:00" },
  { label: "Midday", detail: "12:00 PM", value: "12:00" },
  { label: "Evening", detail: "6:00 PM", value: "18:00" },
];

export default function HealthReminderSettingsScreen({ navigation }: any) {
  const [enabled, setEnabled] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(DEFAULT_HEALTH_REMINDER_TYPES);
  const [weekday, setWeekday] = useState(DEFAULT_HEALTH_REMINDER_DAY);
  const [time, setTime] = useState(DEFAULT_HEALTH_REMINDER_TIME);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedEnabled, storedTypes, storedDay, storedTime] = await Promise.all([
        SecureStore.getItemAsync(HEALTH_REMINDERS_ENABLED_KEY),
        SecureStore.getItemAsync(HEALTH_REMINDER_TYPES_KEY),
        SecureStore.getItemAsync(HEALTH_REMINDER_DAY_KEY),
        SecureStore.getItemAsync(HEALTH_REMINDER_TIME_KEY),
      ]);
      setEnabled(storedEnabled === "true");
      if (storedTypes) setSelectedTypes(JSON.parse(storedTypes));
      const parsedDay = Number(storedDay);
      if (Number.isFinite(parsedDay) && parsedDay >= 1 && parsedDay <= 7) setWeekday(parsedDay);
      if (storedTime) setTime(storedTime);
    })();
  }, []);

  const toggleType = async (id: string) => {
    const next = selectedTypes.includes(id) ? selectedTypes.filter((type) => type !== id) : [...selectedTypes, id];
    setSelectedTypes(next);
    await SecureStore.setItemAsync(HEALTH_REMINDER_TYPES_KEY, JSON.stringify(next));
  };

  const chooseDay = async (value: number) => {
    setWeekday(value);
    await SecureStore.setItemAsync(HEALTH_REMINDER_DAY_KEY, String(value));
  };

  const chooseTime = async (value: string) => {
    setTime(value);
    await SecureStore.setItemAsync(HEALTH_REMINDER_TIME_KEY, value);
  };

  const applySettings = async (nextEnabled = enabled) => {
    if (nextEnabled && selectedTypes.length === 0) {
      Alert.alert("Choose at least one reminder", "Select vitals, health check-in, or medication review before turning on Health Reminders.");
      setEnabled(false);
      await SecureStore.deleteItemAsync(HEALTH_REMINDERS_ENABLED_KEY);
      return;
    }

    setSaving(true);
    try {
      if (nextEnabled) {
        await scheduleHealthReminders({ types: selectedTypes, weekday, time });
        setEnabled(true);
      } else {
        await cancelHealthReminders();
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
          <BellRing size={13} color={colors.primary} />
          <Text style={styles.badgeText}>{enabled ? "On" : "Off"}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <HeartPulse size={29} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>HEALTH REMINDERS</Text>
        <Text style={styles.title}>Choose your weekly health nudges.</Text>
        <Text style={styles.subtitle}>Set the routine reminders that help you keep Remi updated without crowding your day.</Text>
      </View>

      <View style={styles.controlCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.controlTitle}>Health reminders</Text>
          <Text style={styles.controlText}>{enabled ? `${selectedTypes.length} weekly reminder${selectedTypes.length === 1 ? "" : "s"} selected` : "Turn on weekly vitals, check-in, or medication review reminders."}</Text>
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
        {reminderTypes.map((item) => {
          const active = selectedTypes.includes(item.id);
          return (
            <Pressable key={item.id} onPress={() => toggleType(item.id)} style={[styles.optionRow, active && styles.optionActive]}>
              <View style={styles.optionIcon}>{item.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{item.title}</Text>
                <Text style={styles.optionText}>{item.detail}</Text>
              </View>
              <View style={[styles.checkBox, active && styles.checkBoxActive]}>{active ? <Check size={13} color={colors.bg} /> : null}</View>
            </Pressable>
          );
        })}
      </View>

      <ChoiceSection title="Day" options={dayOptions} selected={weekday} onSelect={chooseDay} />
      <ChoiceSection title="Time" options={timeOptions} selected={time} onSelect={chooseTime} showDetail />

      <View style={styles.note}>
        <ShieldCheck size={15} color={colors.mint} />
        <Text style={styles.noteText}>Quiet Hours can silence these routine reminders during your rest window. Medication dose reminders remain managed from the Meds screen.</Text>
      </View>

      <PrimaryButton title={saving ? "Saving..." : "Save health reminders"} onPress={() => applySettings(enabled)} style={{ opacity: saving ? 0.62 : 1 }} />
    </ScrollView>
  );
}

function ChoiceSection({
  title,
  options,
  selected,
  onSelect,
  showDetail,
}: {
  title: string;
  options: { label: string; value: number | string; detail?: string }[];
  selected: number | string;
  onSelect: (value: any) => void;
  showDetail?: boolean;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Clock3 size={16} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <Pressable key={String(option.value)} onPress={() => onSelect(option.value)} style={[styles.choiceRow, active && styles.optionActive]}>
            <View>
              <Text style={styles.choiceText}>{option.label}</Text>
              {showDetail && option.detail ? <Text style={styles.choiceDetail}>{option.detail}</Text> : null}
            </View>
            <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
          </Pressable>
        );
      })}
    </View>
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
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 2 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  sectionLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginHorizontal: 16, marginBottom: 2 },
  optionRow: { minHeight: 72, flexDirection: "row", alignItems: "center", padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  optionActive: { backgroundColor: colors.primaryDim },
  optionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", marginRight: 12 },
  optionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  optionText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 4 },
  checkBox: { width: 23, height: 23, borderRadius: 8, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  checkBoxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceRow: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  choiceText: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13.5 },
  choiceDetail: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 3 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  note: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14, marginBottom: 14 },
  noteText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
