import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ArrowLeft, BellOff, Check, Clock3, Moon, ShieldCheck, Sunrise } from "lucide-react-native";
import { colors, fonts, spacing } from "../theme/tokens";
import {
  DEFAULT_QUIET_HOURS_END,
  DEFAULT_QUIET_HOURS_START,
  QUIET_HOURS_ENABLED_KEY,
  QUIET_HOURS_END_KEY,
  QUIET_HOURS_START_KEY,
  isQuietHoursActive,
} from "../services/notifications";

const startOptions = [
  { label: "9:00 PM", value: "21:00" },
  { label: "10:00 PM", value: "22:00" },
  { label: "11:00 PM", value: "23:00" },
  { label: "Midnight", value: "00:00" },
];

const endOptions = [
  { label: "6:00 AM", value: "06:00" },
  { label: "7:00 AM", value: "07:00" },
  { label: "8:00 AM", value: "08:00" },
  { label: "9:00 AM", value: "09:00" },
];

export default function QuietHoursSettingsScreen({ navigation }: any) {
  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState(DEFAULT_QUIET_HOURS_START);
  const [end, setEnd] = useState(DEFAULT_QUIET_HOURS_END);
  const [activeNow, setActiveNow] = useState(false);

  const refreshActiveState = async () => setActiveNow(await isQuietHoursActive());

  useEffect(() => {
    (async () => {
      const [storedEnabled, storedStart, storedEnd] = await Promise.all([
        SecureStore.getItemAsync(QUIET_HOURS_ENABLED_KEY),
        SecureStore.getItemAsync(QUIET_HOURS_START_KEY),
        SecureStore.getItemAsync(QUIET_HOURS_END_KEY),
      ]);
      setEnabled(storedEnabled === "true");
      if (storedStart) setStart(storedStart);
      if (storedEnd) setEnd(storedEnd);
      await refreshActiveState();
    })();
  }, []);

  const toggleQuietHours = async (value: boolean) => {
    setEnabled(value);
    if (value) await SecureStore.setItemAsync(QUIET_HOURS_ENABLED_KEY, "true");
    else await SecureStore.deleteItemAsync(QUIET_HOURS_ENABLED_KEY);
    await refreshActiveState();
  };

  const chooseStart = async (value: string) => {
    setStart(value);
    await SecureStore.setItemAsync(QUIET_HOURS_START_KEY, value);
    await refreshActiveState();
  };

  const chooseEnd = async (value: string) => {
    setEnd(value);
    await SecureStore.setItemAsync(QUIET_HOURS_END_KEY, value);
    await refreshActiveState();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <Moon size={13} color={colors.primary} />
          <Text style={styles.badgeText}>{enabled ? "On" : "Off"}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <BellOff size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>QUIET HOURS</Text>
        <Text style={styles.title}>Reduce reminders while you rest.</Text>
        <Text style={styles.subtitle}>Choose when Remi should keep routine notification alerts quiet. Your health data stays on device for this preference.</Text>
      </View>

      <View style={styles.controlCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.controlTitle}>Quiet Hours</Text>
          <Text style={styles.controlText}>Silence routine Remi reminders between your selected start and end time.</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggleQuietHours}
          trackColor={{ false: colors.surfaceRaised, true: colors.primaryDim }}
          thumbColor={enabled ? colors.primary : colors.inkFaint}
          ios_backgroundColor={colors.surfaceRaised}
        />
      </View>

      <View style={styles.statusCard}>
        <Clock3 size={17} color={activeNow ? colors.peach : colors.mint} />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusTitle}>{activeNow ? "Quiet Hours active now" : "Quiet Hours not active now"}</Text>
          <Text style={styles.statusText}>{enabled ? `${formatTime(start)} to ${formatTime(end)}` : "Turn it on to apply your selected schedule."}</Text>
        </View>
      </View>

      <TimeSection title="Start time" icon={<Moon size={16} color={colors.primary} />} options={startOptions} selected={start} onSelect={chooseStart} />
      <TimeSection title="End time" icon={<Sunrise size={16} color={colors.primary} />} options={endOptions} selected={end} onSelect={chooseEnd} />

      <View style={styles.note}>
        <ShieldCheck size={15} color={colors.mint} />
        <Text style={styles.noteText}>Quiet Hours affects routine Remi reminders. Emergency calls and system-level alerts are still controlled by your phone.</Text>
      </View>
    </ScrollView>
  );
}

function TimeSection({
  title,
  icon,
  options,
  selected,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <Pressable key={option.value} onPress={() => onSelect(option.value)} style={[styles.optionRow, active && styles.optionActive]}>
            <Text style={styles.optionText}>{option.label}</Text>
            <View style={[styles.radio, active && styles.radioActive]}>{active ? <Check size={13} color={colors.bg} /> : null}</View>
          </Pressable>
        );
      })}
    </View>
  );
}

function formatTime(value: string) {
  const [hourRaw, minute = "00"] = value.split(":");
  const hour = Number(hourRaw);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
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
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14, marginBottom: 12 },
  statusTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  statusText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  section: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingTop: 14, marginBottom: 12, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 2 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  optionRow: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  optionActive: { backgroundColor: colors.primaryDim },
  optionText: { color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 13.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  radioActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  note: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14 },
  noteText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
