import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { CalendarDays, Check, ChevronRight, Moon, Sparkles, ThermometerSun } from "lucide-react-native";
import { Card, PrimaryButton } from "../components/UI";
import { addRecentActivity } from "../services/recentActivity";
import { colors, fonts } from "../theme/tokens";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function WomensHealthScreen() {
  const [mode, setMode] = useState<"cycle" | "menopause">("cycle");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>WOMENS HEALTH</Text>
          <Text style={styles.title}>Personal health tracking</Text>
          <Text style={styles.subtitle}>Log cycle patterns, symptoms, menopause notes, and trends in a private, focused space.</Text>
        </View>
        <View style={styles.headerIcon}>
          <Sparkles size={24} color={colors.peach} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.modeSwitcher}>
          <Pressable onPress={() => setMode("cycle")} style={[styles.modeButton, mode === "cycle" && styles.modeButtonActive]}>
            <CalendarDays size={15} color={mode === "cycle" ? colors.primary : colors.inkFaint} />
            <Text style={[styles.modeText, mode === "cycle" && styles.modeTextActive]}>Cycle</Text>
          </Pressable>
          <Pressable onPress={() => setMode("menopause")} style={[styles.modeButton, mode === "menopause" && styles.modeButtonActive]}>
            <ThermometerSun size={15} color={mode === "menopause" ? colors.primary : colors.inkFaint} />
            <Text style={[styles.modeText, mode === "menopause" && styles.modeTextActive]}>Menopause</Text>
          </Pressable>
        </View>

        {mode === "cycle" ? <CycleTracker /> : <MenopauseTracker />}
      </View>
    </ScrollView>
  );
}

function CycleTracker() {
  const [startDate, setStartDate] = useState("");
  const [flow, setFlow] = useState("medium");
  const [symptoms, setSymptoms] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [irregularityNote, setIrregularityNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    try {
      const token = await SecureStore.getItemAsync("remi_session_token");
      const res = await fetch(`${API_BASE_URL}/womens-health/cycle`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setEntries(data.entries || []);
      setIrregularityNote(data.irregularityNote);
    } catch {
      setEntries([]);
      setIrregularityNote(null);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!startDate.trim()) {
      Alert.alert("Add a start date", "Please enter the cycle start date before saving.");
      return;
    }

    setSaving(true);
    const token = await SecureStore.getItemAsync("remi_session_token");
    try {
      await fetch(`${API_BASE_URL}/womens-health/cycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startDate: startDate.trim(), endDate: null, flow, symptoms: symptoms.trim() }),
      });
      await addRecentActivity({
        type: "lifestyle",
        title: "Cycle entry logged",
        detail: `${startDate.trim()}, ${flow} flow`,
        route: "WomensHealth",
      });
      setStartDate("");
      setSymptoms("");
      setSaved(true);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.trackerWrap}>
      <Card style={styles.insightCard}>
        <View style={styles.insightIcon}>
          <Sparkles size={17} color={colors.peach} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.insightLabel}>Cycle insight</Text>
          <Text style={styles.insightText}>{irregularityNote || "Remi will surface cycle pattern notes after you have a few entries."}</Text>
        </View>
      </Card>

      <Card style={styles.formCard}>
        <SectionTitle icon={<CalendarDays size={16} color={colors.primary} />} title="Log cycle entry" />
        <Input label="Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />

        <Text style={styles.label}>Flow level</Text>
        <View style={styles.choiceRow}>
          {["light", "medium", "heavy"].map((item) => (
            <Pressable key={item} onPress={() => setFlow(item)} style={[styles.choiceChip, flow === item && styles.choiceChipActive]}>
              <Text style={[styles.choiceText, flow === item && styles.choiceTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Input label="Symptoms" value={symptoms} onChangeText={setSymptoms} placeholder="Cramps, fatigue, mood changes..." multiline />
      </Card>

      {saved ? (
        <View style={styles.savedBanner}>
          <Check size={15} color={colors.mint} />
          <Text style={styles.savedText}>Cycle entry saved.</Text>
        </View>
      ) : null}

      <PrimaryButton title={saving ? "Saving..." : "Log cycle entry"} onPress={save} />
      <RecentCycleEntries entries={entries} />
    </View>
  );
}

function MenopauseTracker() {
  const [hotFlashes, setHotFlashes] = useState(false);
  const [sleepDisruption, setSleepDisruption] = useState(false);
  const [moodNote, setMoodNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);

  const load = async () => {
    try {
      const token = await SecureStore.getItemAsync("remi_session_token");
      const res = await fetch(`${API_BASE_URL}/womens-health/menopause`, { headers: { Authorization: `Bearer ${token}` } });
      setEntries(await res.json());
    } catch {
      setEntries([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!hotFlashes && !sleepDisruption && !moodNote.trim()) {
      Alert.alert("Add a symptom note", "Select at least one symptom or add a mood note before saving.");
      return;
    }

    setSaving(true);
    const token = await SecureStore.getItemAsync("remi_session_token");
    try {
      await fetch(`${API_BASE_URL}/womens-health/menopause`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hotFlashes, moodNote: moodNote.trim(), sleepDisruption }),
      });
      await addRecentActivity({
        type: "lifestyle",
        title: "Menopause check-in logged",
        detail: hotFlashes ? "Hot flashes noted" : sleepDisruption ? "Sleep disruption noted" : "Mood note saved",
        route: "WomensHealth",
      });
      setMoodNote("");
      setHotFlashes(false);
      setSleepDisruption(false);
      setSaved(true);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.trackerWrap}>
      <Card style={styles.insightCard}>
        <View style={styles.insightIcon}>
          <Moon size={17} color={colors.peach} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.insightLabel}>Daily check-in</Text>
          <Text style={styles.insightText}>Track symptoms and sleep changes so recurring patterns are easier to discuss during care visits.</Text>
        </View>
      </Card>

      <Card style={styles.formCard}>
        <SectionTitle icon={<ThermometerSun size={16} color={colors.primary} />} title="Symptoms today" />
        <ToggleRow label="Hot flashes" value={hotFlashes} onPress={() => setHotFlashes(!hotFlashes)} />
        <ToggleRow label="Sleep disruption" value={sleepDisruption} onPress={() => setSleepDisruption(!sleepDisruption)} />
        <Input label="Mood or body notes" value={moodNote} onChangeText={setMoodNote} placeholder="Mood, energy, night sweats, headaches..." multiline />
      </Card>

      {saved ? (
        <View style={styles.savedBanner}>
          <Check size={15} color={colors.mint} />
          <Text style={styles.savedText}>Menopause check-in saved.</Text>
        </View>
      ) : null}

      <PrimaryButton title={saving ? "Saving..." : "Log check-in"} onPress={save} />
      <RecentMenopauseEntries entries={entries} />
    </View>
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
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

function ToggleRow({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.toggleItem}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.switchTrack, value && styles.switchTrackActive]}>
        <View style={[styles.switchKnob, value && styles.switchKnobActive]} />
      </View>
    </Pressable>
  );
}

function RecentCycleEntries({ entries }: { entries: any[] }) {
  return (
    <View>
      <Text style={styles.sectionLabel}>RECENT CYCLE ENTRIES</Text>
      {entries.length ? (
        entries.slice(0, 5).map((entry, index) => (
          <EntryCard key={`${entry.start_date}-${index}`} title={entry.start_date || "Cycle entry"} detail={`${entry.flow || "Flow not set"}${entry.symptoms ? `, ${entry.symptoms}` : ""}`} />
        ))
      ) : (
        <EmptyState text="No cycle entries yet." />
      )}
    </View>
  );
}

function RecentMenopauseEntries({ entries }: { entries: any[] }) {
  return (
    <View>
      <Text style={styles.sectionLabel}>RECENT CHECK-INS</Text>
      {entries.length ? (
        entries.slice(0, 5).map((entry, index) => (
          <EntryCard
            key={`${entry.created_at}-${index}`}
            title={entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "Check-in"}
            detail={`${entry.hot_flashes ? "Hot flashes" : "No hot flashes"}${entry.sleep_disruption ? ", sleep disrupted" : ""}${entry.mood_note ? `, ${entry.mood_note}` : ""}`}
          />
        ))
      ) : (
        <EmptyState text="No menopause check-ins yet." />
      )}
    </View>
  );
}

function EntryCard({ title, detail }: { title: string; detail: string }) {
  return (
    <Card style={styles.entryCard}>
      <View style={styles.entryDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.entryTitle}>{title}</Text>
        <Text style={styles.entryText}>{detail}</Text>
      </View>
      <ChevronRight size={15} color={colors.inkFaint} />
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 28, paddingTop: 56, paddingBottom: 20 },
  eyebrow: { color: colors.peach, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34, maxWidth: 250 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 270 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.peachDim, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 28, gap: 14 },
  modeSwitcher: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 999, padding: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  modeButton: { flex: 1, minHeight: 42, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  modeButtonActive: { backgroundColor: colors.primaryDim },
  modeText: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 12.5 },
  modeTextActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  trackerWrap: { gap: 12 },
  insightCard: { flexDirection: "row", alignItems: "flex-start", padding: 14, backgroundColor: colors.peachDim },
  insightIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginRight: 11 },
  insightLabel: { color: colors.peach, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  insightText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  formCard: { padding: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  inputWrap: { marginBottom: 12 },
  label: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 14, paddingVertical: 12, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5 },
  inputMultiline: { minHeight: 84, textAlignVertical: "top" },
  choiceRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  choiceChip: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, minHeight: 40 },
  choiceChipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  choiceText: { color: colors.inkSoft, fontFamily: fonts.bodyMedium, fontSize: 12, textTransform: "capitalize" },
  choiceTextActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  toggleItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14, marginBottom: 10 },
  toggleLabel: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  switchTrack: { width: 46, height: 26, borderRadius: 999, backgroundColor: colors.surfaceRaised, justifyContent: "center", paddingHorizontal: 3 },
  switchTrackActive: { backgroundColor: colors.primary },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface },
  switchKnobActive: { alignSelf: "flex-end" },
  savedBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 13 },
  savedText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 12, marginLeft: 8 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginTop: 8, marginBottom: 2 },
  entryCard: { flexDirection: "row", alignItems: "center", padding: 13, marginTop: 8 },
  entryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.peach, marginRight: 11 },
  entryTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  entryText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  emptyState: { backgroundColor: colors.surface, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16, marginTop: 8 },
  emptyText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5, textAlign: "center" },
});
