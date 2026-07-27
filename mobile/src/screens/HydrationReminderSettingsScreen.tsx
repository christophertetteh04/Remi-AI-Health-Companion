import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ArrowLeft, BellRing, Check, Droplets, Moon, ShieldCheck, Sun, Sunrise } from "lucide-react-native";
import { PrimaryButton } from "../components/UI";
import { colors, fonts, spacing } from "../theme/tokens";
import {
  DEFAULT_HYDRATION_TIMES,
  HYDRATION_ENABLED_KEY,
  HYDRATION_TIMES_KEY,
  cancelHydrationReminder,
  scheduleHydrationReminders,
} from "../services/notifications";

const reminderTimes = [
  { label: "Morning", detail: "10:00 AM", value: "10:00", icon: <Sunrise size={17} color={colors.primary} /> },
  { label: "Midday", detail: "1:00 PM", value: "13:00", icon: <Sun size={17} color={colors.primary} /> },
  { label: "Afternoon", detail: "4:00 PM", value: "16:00", icon: <Droplets size={17} color={colors.primary} /> },
  { label: "Evening", detail: "7:00 PM", value: "19:00", icon: <Moon size={17} color={colors.primary} /> },
];

export default function HydrationReminderSettingsScreen({ navigation }: any) {
  const [enabled, setEnabled] = useState(false);
  const [selectedTimes, setSelectedTimes] = useState<string[]>(DEFAULT_HYDRATION_TIMES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [storedEnabled, storedTimes] = await Promise.all([
        SecureStore.getItemAsync(HYDRATION_ENABLED_KEY),
        SecureStore.getItemAsync(HYDRATION_TIMES_KEY),
      ]);
      setEnabled(storedEnabled === "true");
      if (storedTimes) setSelectedTimes(JSON.parse(storedTimes));
    })();
  }, []);

  const toggleTime = async (value: string) => {
    const next = selectedTimes.includes(value) ? selectedTimes.filter((time) => time !== value) : [...selectedTimes, value].sort();
    setSelectedTimes(next);
    await SecureStore.setItemAsync(HYDRATION_TIMES_KEY, JSON.stringify(next));
  };

  const applySettings = async (nextEnabled = enabled) => {
    if (nextEnabled && selectedTimes.length === 0) {
      Alert.alert("Choose at least one time", "Select at least one hydration reminder time before turning reminders on.");
      setEnabled(false);
      await SecureStore.deleteItemAsync(HYDRATION_ENABLED_KEY);
      return;
    }

    setSaving(true);
    try {
      if (nextEnabled) {
        await scheduleHydrationReminders(selectedTimes);
        setEnabled(true);
      } else {
        await cancelHydrationReminder();
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
          <Droplets size={13} color={colors.primary} />
          <Text style={styles.badgeText}>{enabled ? "On" : "Off"}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Droplets size={29} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>HYDRATION</Text>
        <Text style={styles.title}>Gentle water reminders, your way.</Text>
        <Text style={styles.subtitle}>Choose when Remi should nudge you to pause for water. These reminders are routine wellness prompts only.</Text>
      </View>

      <View style={styles.controlCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.controlTitle}>Hydration reminders</Text>
          <Text style={styles.controlText}>{enabled ? `${selectedTimes.length} daily reminder${selectedTimes.length === 1 ? "" : "s"} selected` : "Turn on gentle daily water reminders."}</Text>
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
        <Text style={styles.sectionLabel}>REMINDER TIMES</Text>
        {reminderTimes.map((time) => {
          const active = selectedTimes.includes(time.value);
          return (
            <Pressable key={time.value} onPress={() => toggleTime(time.value)} style={[styles.optionRow, active && styles.optionActive]}>
              <View style={styles.optionIcon}>{time.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{time.label}</Text>
                <Text style={styles.optionText}>{time.detail}</Text>
              </View>
              <View style={[styles.checkBox, active && styles.checkBoxActive]}>{active ? <Check size={13} color={colors.bg} /> : null}</View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.note}>
        <ShieldCheck size={15} color={colors.mint} />
        <Text style={styles.noteText}>Quiet Hours can still silence these routine reminders during your rest window.</Text>
      </View>

      <PrimaryButton title={saving ? "Saving..." : "Save hydration choices"} onPress={() => applySettings(enabled)} style={{ opacity: saving ? 0.62 : 1 }} />
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
  note: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14, marginBottom: 14 },
  noteText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
