import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { CalendarDays, Check, ChevronRight, Heart, Lock, Moon, Pill, Smile, Sparkles, ThermometerSun } from "lucide-react-native";
import { Card, PrimaryButton } from "../components/UI";
import DatePickerField from "../components/DatePickerField";
import { addRecentActivity } from "../services/recentActivity";
import { showRemiToast } from "../components/RemiToast";
import { colors, fonts } from "../theme/tokens";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
const CYCLE_DETAIL_KEY = "remi_cycle_detail_entries";

const symptomOptions = ["Cramps", "Headache", "Back pain", "Bloating", "Tender breasts", "Acne", "Fatigue", "Nausea"];
const moodOptions = ["Calm", "Happy", "Sensitive", "Irritable", "Anxious", "Low energy"];
const mucusOptions = ["Not sure", "Dry", "Sticky", "Creamy", "Watery", "Egg white"];
const ovulationOptions = ["Not tested", "Negative", "Positive"];

const getCyclePrediction = (entries: any[]) => {
  const starts = entries
    .map((entry) => entry.start_date)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  const lengths: number[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const diff = Math.round((starts[i].getTime() - starts[i + 1].getTime()) / 86400000);
    if (diff >= 18 && diff <= 60) lengths.push(diff);
  }
  const averageLength = lengths.length ? Math.round(lengths.reduce((sum, value) => sum + value, 0) / lengths.length) : 28;
  const latestStart = starts[0] || new Date();
  const nextPeriod = addDays(latestStart, averageLength);
  while (nextPeriod < new Date()) nextPeriod.setDate(nextPeriod.getDate() + averageLength);
  const ovulation = addDays(nextPeriod, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileDates = Array.from({ length: 7 }, (_, index) => toISODate(addDays(fertileStart, index)));
  const periodDates = Array.from({ length: 5 }, (_, index) => toISODate(addDays(nextPeriod, index)));
  const cycleDay = Math.max(1, Math.round((new Date().getTime() - latestStart.getTime()) / 86400000) + 1);

  return {
    averageLength,
    cycleDay,
    nextPeriodLabel: formatShortDate(nextPeriod),
    ovulationLabel: formatShortDate(ovulation),
    fertileLabel: `${formatShortDate(fertileStart)} - ${formatShortDate(addDays(fertileStart, 6))}`,
    fertileDates,
    periodDates,
    ovulationDate: toISODate(ovulation),
  };
};

export default function WomensHealthScreen() {
  const [mode, setMode] = useState<"cycle" | "menopause">("cycle");

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}>
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
    </KeyboardAvoidingView>
  );
}

function CycleTracker() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [flow, setFlow] = useState("medium");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [temperature, setTemperature] = useState("");
  const [weight, setWeight] = useState("");
  const [medication, setMedication] = useState("");
  const [cervicalMucus, setCervicalMucus] = useState("Not sure");
  const [ovulationTest, setOvulationTest] = useState("Not tested");
  const [intimacy, setIntimacy] = useState(false);
  const [pillTaken, setPillTaken] = useState(false);
  const [discreetMode, setDiscreetMode] = useState(true);
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<any[]>([]);
  const [irregularityNote, setIrregularityNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    try {
      const token = await SecureStore.getItemAsync("remi_session_token");
      const res = await fetch(`${API_BASE_URL}/womens-health/cycle`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const local = await loadLocalCycleEntries();
      setEntries(local.length ? local : data.entries || []);
      setIrregularityNote(data.irregularityNote);
    } catch {
      setEntries(await loadLocalCycleEntries());
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
    const detailEntry = {
      id: `${Date.now()}`,
      start_date: startDate.trim(),
      end_date: endDate.trim() || null,
      flow,
      symptoms: selectedSymptoms,
      moods: selectedMoods,
      temperature: temperature.trim(),
      weight: weight.trim(),
      medication: medication.trim(),
      cervicalMucus,
      ovulationTest,
      intimacy,
      pillTaken,
      notes: notes.trim(),
      discreetMode,
      created_at: new Date().toISOString(),
    };
    const summary = cycleSummary(detailEntry);
    try {
      await saveLocalCycleEntry(detailEntry);
      await fetch(`${API_BASE_URL}/womens-health/cycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startDate: startDate.trim(), endDate: endDate.trim() || null, flow, symptoms: summary.slice(0, 500) }),
      });
      await addRecentActivity({
        type: "lifestyle",
        title: "Cycle entry logged",
        detail: summary,
        route: "WomensHealth",
      });
      setStartDate("");
      setEndDate("");
      setSelectedSymptoms([]);
      setSelectedMoods([]);
      setTemperature("");
      setWeight("");
      setMedication("");
      setCervicalMucus("Not sure");
      setOvulationTest("Not tested");
      setIntimacy(false);
      setPillTaken(false);
      setNotes("");
      setSaved(true);
      showRemiToast("Saved", "Cycle entry saved successfully.", "bottom");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const prediction = getCyclePrediction(entries);

  return (
    <View style={styles.trackerWrap}>
      <Card style={styles.cycleHeroCard}>
        <View style={styles.cycleHeroTop}>
          <View>
            <Text style={styles.insightLabel}>Cycle forecast</Text>
            <Text style={styles.cycleHeroTitle}>{prediction.nextPeriodLabel}</Text>
          </View>
          <View style={styles.cycleDayBadge}>
            <Text style={styles.cycleDayValue}>{prediction.cycleDay}</Text>
            <Text style={styles.cycleDayText}>day</Text>
          </View>
        </View>
        <View style={styles.predictionGrid}>
          <PredictionTile title="Ovulation" value={prediction.ovulationLabel} />
          <PredictionTile title="Fertile window" value={prediction.fertileLabel} />
          <PredictionTile title="Average cycle" value={`${prediction.averageLength} days`} />
        </View>
      </Card>

      <CalendarPreview entries={entries} />

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
        <SectionTitle icon={<CalendarDays size={16} color={colors.primary} />} title="Period dates" />
        <DatePickerField label="Start date" value={startDate} onChange={setStartDate} placeholder="Select cycle start date" />
        <DatePickerField label="End date" value={endDate} onChange={setEndDate} placeholder="Optional end date" />

        <Text style={styles.label}>Flow level</Text>
        <View style={styles.choiceRow}>
          {["spotting", "light", "medium", "heavy", "not_sure"].map((item) => (
            <Pressable key={item} onPress={() => setFlow(item)} style={[styles.choiceChip, flow === item && styles.choiceChipActive]}>
              <Text style={[styles.choiceText, flow === item && styles.choiceTextActive]}>{item.replace("_", " ")}</Text>
            </Pressable>
          ))}
        </View>

        <SectionTitle icon={<Smile size={16} color={colors.primary} />} title="Symptoms and mood" />
        <Text style={styles.label}>Symptoms</Text>
        <ChipGrid options={symptomOptions} selected={selectedSymptoms} onToggle={(item) => toggleArray(item, selectedSymptoms, setSelectedSymptoms)} />
        <Text style={styles.label}>Mood</Text>
        <ChipGrid options={moodOptions} selected={selectedMoods} onToggle={(item) => toggleArray(item, selectedMoods, setSelectedMoods)} />

        <SectionTitle icon={<ThermometerSun size={16} color={colors.primary} />} title="Body details" />
        <View style={styles.grid}>
          <Input label="Temperature" value={temperature} onChangeText={setTemperature} placeholder="e.g. 36.7" keyboardType="numbers-and-punctuation" />
          <Input label="Weight" value={weight} onChangeText={setWeight} placeholder="e.g. 64 kg" keyboardType="numbers-and-punctuation" />
        </View>

        <SectionTitle icon={<Heart size={16} color={colors.primary} />} title="Fertility observations" />
        <Text style={styles.label}>Cervical mucus</Text>
        <View style={styles.choiceRowWrap}>
          {mucusOptions.map((item) => (
            <Pressable key={item} onPress={() => setCervicalMucus(item)} style={[styles.choiceChipSmall, cervicalMucus === item && styles.choiceChipActive]}>
              <Text style={[styles.choiceText, cervicalMucus === item && styles.choiceTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Ovulation test</Text>
        <View style={styles.choiceRow}>
          {ovulationOptions.map((item) => (
            <Pressable key={item} onPress={() => setOvulationTest(item)} style={[styles.choiceChip, ovulationTest === item && styles.choiceChipActive]}>
              <Text style={[styles.choiceText, ovulationTest === item && styles.choiceTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <SectionTitle icon={<Pill size={16} color={colors.primary} />} title="Medication and privacy" />
        <Input label="Medication or birth control" value={medication} onChangeText={setMedication} placeholder="Pill, patch, injection, pain relief..." />
        <ToggleRow label="Pill or medication taken today" value={pillTaken} onPress={() => setPillTaken(!pillTaken)} />
        <ToggleRow label="Intimacy logged" value={intimacy} onPress={() => setIntimacy(!intimacy)} />
        <ToggleRow label="Discreet mode for fertility/intimacy details" value={discreetMode} onPress={() => setDiscreetMode(!discreetMode)} />
        <Input label="Private diary note" value={notes} onChangeText={setNotes} placeholder="Anything you want to remember for yourself or your clinician..." multiline />
      </Card>

      {saved ? (
        <View style={styles.savedBanner}>
          <Check size={15} color={colors.mint} />
          <Text style={styles.savedText}>Cycle entry saved.</Text>
        </View>
      ) : null}

      <PrimaryButton title={saving ? "Saving..." : "Save cycle log"} onPress={save} />
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

function PredictionTile({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.predictionTile}>
      <Text style={styles.predictionTitle}>{title}</Text>
      <Text style={styles.predictionValue}>{value}</Text>
    </View>
  );
}

function CalendarPreview({ entries }: { entries: any[] }) {
  const prediction = getCyclePrediction(entries);
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    const iso = toISODate(date);
    return { date, iso };
  });

  return (
    <Card style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <SectionTitle icon={<CalendarDays size={16} color={colors.primary} />} title="Calendar preview" />
        <View style={styles.lockPill}>
          <Lock size={12} color={colors.mint} />
          <Text style={styles.lockText}>Private</Text>
        </View>
      </View>
      <View style={styles.calendarGrid}>
        {days.map((day) => {
          const period = prediction.periodDates.includes(day.iso);
          const fertile = prediction.fertileDates.includes(day.iso);
          const ovulation = prediction.ovulationDate === day.iso;
          return (
            <View key={day.iso} style={[styles.calendarDay, fertile && styles.calendarFertile, period && styles.calendarPeriod, ovulation && styles.calendarOvulation]}>
              <Text style={[styles.calendarWeekday, (period || ovulation) && styles.calendarDayActiveText]}>{day.date.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</Text>
              <Text style={[styles.calendarDate, (period || ovulation) && styles.calendarDayActiveText]}>{day.date.getDate()}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <LegendDot color={colors.peach} label="Period" />
        <LegendDot color={colors.mint} label="Fertile" />
        <LegendDot color={colors.primary} label="Ovulation" />
      </View>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function ChipGrid({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return (
    <View style={styles.choiceRowWrap}>
      {options.map((item) => (
        <Pressable key={item} onPress={() => onToggle(item)} style={[styles.choiceChipSmall, selected.includes(item) && styles.choiceChipActive]}>
          <Text style={[styles.choiceText, selected.includes(item) && styles.choiceTextActive]}>{item}</Text>
        </Pressable>
      ))}
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

function toggleArray(item: string, values: string[], setValues: (values: string[]) => void) {
  setValues(values.includes(item) ? values.filter((value) => value !== item) : [...values, item]);
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
        entries.slice(0, 5).map((entry, index) => {
          const detail = normalizeCycleEntry(entry);
          return <EntryCard key={`${entry.id || entry.start_date}-${index}`} title={entry.start_date || "Cycle entry"} detail={detail} />;
        })
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

async function loadLocalCycleEntries() {
  try {
    const stored = await AsyncStorage.getItem(CYCLE_DETAIL_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveLocalCycleEntry(entry: any) {
  const existing = await loadLocalCycleEntries();
  await AsyncStorage.setItem(CYCLE_DETAIL_KEY, JSON.stringify([entry, ...existing].slice(0, 80)));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function cycleSummary(entry: any) {
  const parts = [`${entry.start_date}, ${String(entry.flow || "flow not set").replace("_", " ")} flow`];
  if (entry.symptoms?.length) parts.push(`symptoms: ${entry.symptoms.join(", ")}`);
  if (entry.moods?.length) parts.push(`mood: ${entry.moods.join(", ")}`);
  if (entry.temperature) parts.push(`temp ${entry.temperature}`);
  if (entry.weight) parts.push(`weight ${entry.weight}`);
  if (entry.pillTaken) parts.push("medication taken");
  if (entry.ovulationTest && entry.ovulationTest !== "Not tested") parts.push(`ovulation test ${entry.ovulationTest}`);
  if (!entry.discreetMode && entry.intimacy) parts.push("intimacy logged");
  if (entry.notes) parts.push(entry.notes);
  return parts.join("; ");
}

function normalizeCycleEntry(entry: any) {
  if (Array.isArray(entry.symptoms) || Array.isArray(entry.moods)) return cycleSummary(entry);
  if (typeof entry.symptoms === "string" && entry.symptoms.trim().startsWith("{")) {
    try {
      return cycleSummary(JSON.parse(entry.symptoms));
    } catch {
      return entry.symptoms;
    }
  }
  return `${String(entry.flow || "Flow not set").replace("_", " ")}${entry.symptoms ? `, ${entry.symptoms}` : ""}`;
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
  cycleHeroCard: { padding: 16 },
  cycleHeroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  cycleHeroTitle: { color: colors.ink, fontFamily: fonts.display, fontSize: 24, lineHeight: 30, marginTop: 3 },
  cycleDayBadge: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.peachDim, alignItems: "center", justifyContent: "center" },
  cycleDayValue: { color: colors.peach, fontFamily: fonts.display, fontSize: 20 },
  cycleDayText: { color: colors.peach, fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  predictionGrid: { flexDirection: "row", gap: 8 },
  predictionTile: { flex: 1, backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 10, minHeight: 70 },
  predictionTitle: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  predictionValue: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16, marginTop: 5 },
  calendarCard: { padding: 16 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  lockPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.mintDim, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  lockText: { color: colors.mint, fontFamily: fonts.bodySemiBold, fontSize: 10.5 },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  calendarDay: { width: "13.2%", minHeight: 52, borderRadius: 12, backgroundColor: colors.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  calendarPeriod: { backgroundColor: colors.peach, borderColor: colors.peach },
  calendarFertile: { backgroundColor: colors.mintDim, borderColor: colors.mint },
  calendarOvulation: { backgroundColor: colors.primary, borderColor: colors.primary },
  calendarWeekday: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 9.5 },
  calendarDate: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13, marginTop: 3 },
  calendarDayActiveText: { color: colors.bg },
  legendRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11 },
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
  grid: { flexDirection: "row", gap: 10 },
  choiceRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  choiceRowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  choiceChip: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, minHeight: 40 },
  choiceChipSmall: { alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, minHeight: 38, paddingHorizontal: 12 },
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
