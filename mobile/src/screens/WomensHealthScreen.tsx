import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colors, fonts } from "../theme/tokens";
import { Card, PrimaryButton, ScreenHeader } from "../components/UI";
import { Sparkles } from "lucide-react-native";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

export default function WomensHealthScreen() {
  const [mode, setMode] = useState<"cycle" | "menopause">("cycle");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Women's health" subtitle="Tracked separately from pregnancy" />
      <View style={{ paddingHorizontal: 28 }}>
        <View style={styles.toggleRow}>
          <Pressable onPress={() => setMode("cycle")} style={[styles.toggleBtn, mode === "cycle" && styles.toggleBtnActive]}>
            <Text style={[styles.toggleText, mode === "cycle" && styles.toggleTextActive]}>Cycle</Text>
          </Pressable>
          <Pressable onPress={() => setMode("menopause")} style={[styles.toggleBtn, mode === "menopause" && styles.toggleBtnActive]}>
            <Text style={[styles.toggleText, mode === "menopause" && styles.toggleTextActive]}>Menopause</Text>
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

  const load = async () => {
    const token = await SecureStore.getItemAsync("remi_session_token");
    const res = await fetch(`${API_BASE_URL}/womens-health/cycle`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setEntries(data.entries || []);
    setIrregularityNote(data.irregularityNote);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!startDate) return;
    setSaving(true);
    const token = await SecureStore.getItemAsync("remi_session_token");
    try {
      await fetch(`${API_BASE_URL}/womens-health/cycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startDate, endDate: null, flow, symptoms }),
      });
      setStartDate(""); setSymptoms("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ marginTop: 16 }}>
      {irregularityNote && (
        <View style={styles.noteCard}>
          <Sparkles size={14} color={colors.peach} />
          <Text style={styles.noteText}>{irregularityNote}</Text>
        </View>
      )}
      <TextInput value={startDate} onChangeText={setStartDate} placeholder="Start date (YYYY-MM-DD)" placeholderTextColor={colors.inkFaint} style={styles.input} />
      <View style={styles.flowRow}>
        {["light", "medium", "heavy"].map((f) => (
          <Pressable key={f} onPress={() => setFlow(f)} style={[styles.flowChip, flow === f && { backgroundColor: colors.primaryDim }]}>
            <Text style={{ color: flow === f ? colors.primary : colors.inkSoft, fontFamily: fonts.body, fontSize: 12 }}>{f}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput value={symptoms} onChangeText={setSymptoms} placeholder="Symptoms (optional)" placeholderTextColor={colors.inkFaint} style={styles.input} />
      <PrimaryButton title={saving ? "Saving…" : "Log entry"} onPress={save} />

      <Text style={styles.sectionLabel}>RECENT ENTRIES</Text>
      {entries.slice(0, 5).map((e, i) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <Text style={styles.entryText}>{e.start_date} — {e.flow}</Text>
        </Card>
      ))}
    </View>
  );
}

function MenopauseTracker() {
  const [hotFlashes, setHotFlashes] = useState(false);
  const [sleepDisruption, setSleepDisruption] = useState(false);
  const [moodNote, setMoodNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);

  const load = async () => {
    const token = await SecureStore.getItemAsync("remi_session_token");
    const res = await fetch(`${API_BASE_URL}/womens-health/menopause`, { headers: { Authorization: `Bearer ${token}` } });
    setEntries(await res.json());
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const token = await SecureStore.getItemAsync("remi_session_token");
    try {
      await fetch(`${API_BASE_URL}/womens-health/menopause`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hotFlashes, moodNote, sleepDisruption }),
      });
      setMoodNote(""); setHotFlashes(false); setSleepDisruption(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ marginTop: 16 }}>
      <Pressable onPress={() => setHotFlashes(!hotFlashes)} style={styles.toggleRowItem}>
        <Text style={styles.toggleLabel}>Hot flashes today</Text>
        <View style={[styles.switch, hotFlashes && { backgroundColor: colors.primary }]} />
      </Pressable>
      <Pressable onPress={() => setSleepDisruption(!sleepDisruption)} style={styles.toggleRowItem}>
        <Text style={styles.toggleLabel}>Sleep disruption</Text>
        <View style={[styles.switch, sleepDisruption && { backgroundColor: colors.primary }]} />
      </Pressable>
      <TextInput value={moodNote} onChangeText={setMoodNote} placeholder="Mood notes (optional)" placeholderTextColor={colors.inkFaint} style={styles.input} />
      <PrimaryButton title={saving ? "Saving…" : "Log entry"} onPress={save} />

      <Text style={styles.sectionLabel}>RECENT ENTRIES</Text>
      {entries.slice(0, 5).map((e, i) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <Text style={styles.entryText}>
            {new Date(e.created_at).toLocaleDateString()} — {e.hot_flashes ? "Hot flashes" : "No hot flashes"}{e.sleep_disruption ? ", sleep disrupted" : ""}
          </Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 999, padding: 4, marginTop: 4 },
  toggleBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 999 },
  toggleBtnActive: { backgroundColor: colors.primaryDim },
  toggleText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5 },
  toggleTextActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, paddingVertical: 14, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, marginBottom: 10 },
  flowRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  flowChip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginTop: 20, marginBottom: 10 },
  entryText: { color: colors.ink, fontFamily: fonts.body, fontSize: 12.5 },
  noteCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, borderRadius: 12, padding: 14, marginBottom: 14 },
  noteText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 17 },
  toggleRowItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14, marginBottom: 10 },
  toggleLabel: { color: colors.ink, fontFamily: fonts.body, fontSize: 13.5 },
  switch: { width: 40, height: 22, borderRadius: 11, backgroundColor: colors.surfaceRaised },
});
