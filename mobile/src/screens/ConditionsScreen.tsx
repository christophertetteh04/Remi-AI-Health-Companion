import React, { useEffect, useState } from "react";
import { Alert, View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { Card } from "../components/UI";
import { Activity, Check, ChevronRight, Droplets, HeartPulse, Home, Pencil, ShieldCheck, Sparkles, Stethoscope } from "lucide-react-native";
import { scheduleHydrationReminder, cancelHydrationReminder } from "../services/notifications";
import { authHeader } from "../services/api";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

const LABELS: Record<string, string> = {
  sickle_cell: "Sickle cell disease",
  hiv_art_adherence: "HIV / ART adherence",
  asthma: "Asthma / respiratory",
  kidney: "Kidney function tracking",
  cholesterol: "Cholesterol tracking",
  thyroid: "Thyroid tracking",
};

const DEFAULT_CONDITIONS = Object.keys(LABELS);
const MAX_SELECTED_CONDITIONS = 2;

const CONDITION_META: Record<string, { detail: string; icon: any; color: string }> = {
  sickle_cell: { detail: "Hydration reminders and pain crisis logging", icon: Droplets, color: colors.primary },
  hiv_art_adherence: { detail: "Medication adherence and appointment support", icon: ShieldCheck, color: colors.mint },
  asthma: { detail: "Respiratory symptoms and trigger awareness", icon: Activity, color: colors.peach },
  kidney: { detail: "Kidney function labs and care reminders", icon: Stethoscope, color: colors.primary },
  cholesterol: { detail: "Cardio-metabolic trends and lifestyle tracking", icon: HeartPulse, color: colors.urgent },
  thyroid: { detail: "Thyroid labs, symptoms, and follow-up notes", icon: Sparkles, color: colors.peach },
};

export default function ConditionsScreen({ navigation }: any) {
  const [available, setAvailable] = useState<string[]>(DEFAULT_CONDITIONS);
  const [tracked, setTracked] = useState<string[]>([]);
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/conditions`, { headers: await authHeader() });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAvailable(data.available?.length ? data.available : DEFAULT_CONDITIONS);
        setTracked(data.tracked || []);
      } catch {
        setAvailable(DEFAULT_CONDITIONS);
      }
    })();
  }, []);

  const toggle = async (condition: string) => {
    if (!editing) return;
    const enabling = !tracked.includes(condition);
    if (enabling && tracked.length >= MAX_SELECTED_CONDITIONS) {
      Alert.alert("Limit reached", "You can select up to two condition support options at a time.");
      return;
    }

    setTracked(enabling ? [...tracked, condition] : tracked.filter((c) => c !== condition));

    try {
      await fetch(`${API_BASE_URL}/conditions/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ condition, enabled: enabling }),
      });
    } catch {
      // Local UI state still updates so users can configure tracking
      // even while the backend is unavailable.
    }

    // Sickle cell tracking includes hydration reminders — schedule
    // or cancel the local notification alongside the opt-in.
    if (condition === "sickle_cell") {
      if (enabling) await scheduleHydrationReminder();
      else await cancelHydrationReminder();
    }

  };

  const finishEditing = () => {
    if (tracked.length > MAX_SELECTED_CONDITIONS) {
      Alert.alert("Review your selections", "Please keep only two condition support options before tapping Done.");
      return;
    }
    setEditing(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 128 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>CONDITIONS</Text>
          <Text style={styles.title}>Choose what Remi tracks</Text>
          <Text style={styles.subtitle}>Select up to two support options that matter most right now. You can edit them anytime.</Text>
        </View>
        <View style={styles.headerIcon}>
          <Stethoscope size={24} color={colors.primary} />
        </View>
      </View>

      <View style={styles.content}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Check size={18} color={colors.mint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>Tracking profile</Text>
            <Text style={styles.summaryTitle}>{tracked.length ? `${tracked.length} active condition${tracked.length === 1 ? "" : "s"}` : "No conditions selected"}</Text>
            <Text style={styles.summaryText}>{MAX_SELECTED_CONDITIONS - tracked.length > 0 ? `${MAX_SELECTED_CONDITIONS - tracked.length} selection${MAX_SELECTED_CONDITIONS - tracked.length === 1 ? "" : "s"} remaining.` : "Selection limit reached."}</Text>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>AVAILABLE SUPPORT</Text>
          <Text style={styles.sectionHint}>{editing ? "Choose up to 2" : "Tap Edit options to change"}</Text>
        </View>
        {available.map((c) => {
          const on = tracked.includes(c);
          const maxedOut = editing && !on && tracked.length >= MAX_SELECTED_CONDITIONS;
          const meta = CONDITION_META[c] || { detail: "Personalized tracking and reminders", icon: Stethoscope, color: colors.primary };
          const Icon = meta.icon;
          return (
            <Pressable key={c} onPress={() => toggle(c)} style={[styles.conditionCard, on && styles.conditionCardActive, !editing && styles.conditionCardLocked, maxedOut && styles.conditionCardDisabled]}>
              <View style={[styles.conditionIcon, { backgroundColor: `${meta.color}16` }]}>
                <Icon size={18} color={meta.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.conditionTop}>
                  <Text style={styles.label}>{LABELS[c] || c}</Text>
                  <View style={[styles.checkbox, on && { backgroundColor: colors.primary, borderColor: colors.primary }, maxedOut && styles.checkboxDisabled]}>
                    {on && <Check size={12} color={colors.bg} />}
                  </View>
                </View>
                <Text style={styles.detail}>{meta.detail}</Text>
                {c === "sickle_cell" && on && (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      navigation.navigate("PainCrisisLog");
                    }}
                    style={styles.linkBtn}
                  >
                    <Text style={styles.linkText}>Log pain crisis</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </Pressable>
                )}
                {c === "hiv_art_adherence" && on && (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      navigation.navigate("ArtAdherence");
                    }}
                    style={styles.linkBtn}
                  >
                    <Text style={styles.linkText}>Set up ART plan</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </Pressable>
                )}
                {c === "asthma" && on && (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      navigation.navigate("AsthmaRespiratory");
                    }}
                    style={styles.linkBtn}
                  >
                    <Text style={styles.linkText}>Set up breathing plan</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </Pressable>
                )}
                {c === "kidney" && on && (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      navigation.navigate("KidneyFunction");
                    }}
                    style={styles.linkBtn}
                  >
                    <Text style={styles.linkText}>Set up kidney plan</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </Pressable>
                )}
                {c === "cholesterol" && on && (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      navigation.navigate("CholesterolTracking");
                    }}
                    style={styles.linkBtn}
                  >
                    <Text style={styles.linkText}>Set up cholesterol plan</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </Pressable>
                )}
                {c === "thyroid" && on && (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      navigation.navigate("ThyroidTracking");
                    }}
                    style={styles.linkBtn}
                  >
                    <Text style={styles.linkText}>Set up thyroid plan</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </Pressable>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable onPress={() => navigation.navigate("Main", { screen: "Home" })} style={styles.homeButton}>
          <Home size={17} color={colors.inkSoft} />
          <Text style={styles.homeButtonText}>Back home</Text>
        </Pressable>
        <Pressable onPress={editing ? finishEditing : () => setEditing(true)} style={[styles.editButton, editing && styles.editButtonActive]}>
          {editing ? <Check size={17} color={colors.bg} /> : <Pencil size={17} color={colors.primary} />}
          <Text style={[styles.editButtonText, editing && styles.editButtonTextActive]}>{editing ? "Done" : "Edit options"}</Text>
        </Pressable>
      </View>
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
  summaryCard: { flexDirection: "row", alignItems: "center", padding: 16 },
  summaryIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.mintDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  summaryTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 16, marginTop: 3 },
  summaryText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  bottomBar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 18,
    flexDirection: "row",
    gap: 8,
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  homeButton: { flex: 1, minHeight: 46, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.bg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  homeButtonText: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  editButton: { flex: 1, minHeight: 46, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.primary, backgroundColor: colors.primaryDim, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  editButtonActive: { backgroundColor: colors.primary },
  editButtonText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  editButtonTextActive: { color: colors.bg },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12, marginTop: 6 },
  sectionHint: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 11.5 },
  conditionCard: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 15 },
  conditionCardActive: { borderColor: colors.primary, backgroundColor: "#FBFDFF" },
  conditionCardLocked: { opacity: 0.96 },
  conditionCardDisabled: { opacity: 0.54 },
  conditionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  conditionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 1.5, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  checkboxDisabled: { backgroundColor: colors.surfaceRaised },
  label: { flex: 1, color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  detail: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 5 },
  linkBtn: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, marginTop: 11 },
  linkText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
});
