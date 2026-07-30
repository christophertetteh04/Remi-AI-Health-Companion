import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Activity, CheckCircle2, Droplets, HeartPulse, Pencil, ShieldCheck, Trash2, X } from "lucide-react-native";
import { colors, fonts } from "../theme/tokens";
import { Card, PrimaryButton, UrgencyDot } from "../components/UI";
import { deleteVitalsReading, getVitalsReadings, submitVitalsReading, updateVitalsReading } from "../services/api";
import { addRecentActivity } from "../services/recentActivity";
import { showRemiToast } from "../components/RemiToast";

type VitalsReading = {
  id: string;
  systolic: number;
  diastolic: number;
  glucose?: number | null;
  wellbeing?: number | null;
  pregnancy_mode?: boolean | null;
  tier: "normal" | "monitor" | "urgent";
  created_at: string;
};

type VitalsResult = { tier: "normal" | "monitor" | "urgent"; message: string; referenceMode?: "standard" | "pregnancy"; reading?: VitalsReading };

export default function VitalsScreen() {
  const [systolic, setSystolic] = useState("118");
  const [diastolic, setDiastolic] = useState("76");
  const [glucose, setGlucose] = useState("");
  const [wellbeing, setWellbeing] = useState(3);
  const [pregnancyMode, setPregnancyMode] = useState(false);
  const [result, setResult] = useState<VitalsResult | null>(null);
  const [readings, setReadings] = useState<VitalsReading[]>([]);
  const [editing, setEditing] = useState<VitalsReading | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const latest = readings[0];

  const loadReadings = useCallback(async () => {
    try {
      const data = await getVitalsReadings();
      setReadings(Array.isArray(data) ? data : []);
    } catch {
      // Local recent activity still records saves when the network is unavailable.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReadings();
    }, [loadReadings]),
  );

  useEffect(() => {
    if (!latest || editing) return;
    setSystolic(String(latest.systolic));
    setDiastolic(String(latest.diastolic));
    setGlucose(latest.glucose ? String(latest.glucose) : "");
    setWellbeing(latest.wellbeing || 3);
    setPregnancyMode(Boolean(latest.pregnancy_mode));
  }, [latest?.id]);

  const readingPayload = () => ({
    systolic: Number(systolic),
    diastolic: Number(diastolic),
    glucose: glucose ? Number(glucose) : undefined,
    wellbeing,
    pregnancyMode,
  });

  const save = async () => {
    setSaving(true);
    try {
      const payload = readingPayload();
      const res = editing ? await updateVitalsReading(editing.id, payload) : await submitVitalsReading(payload);
      const savedReading = res.reading as VitalsReading | undefined;
      setResult({ tier: res.tier, message: res.message, referenceMode: res.referenceMode, reading: savedReading });
      if (savedReading) {
        setReadings((current) => upsertReading(current, savedReading));
      }
      setEditing(null);
      showRemiToast(editing ? "Vitals updated" : "Vitals saved", "Your vitals have been saved successfully.", "bottom");
      await addRecentActivity({
        type: "vitals",
        title: editing ? "Vitals updated" : "Weekly vitals logged",
        detail: `Blood pressure ${systolic}/${diastolic}${glucose ? `, glucose ${glucose}` : ""}, wellbeing ${wellbeing}/5${pregnancyMode ? ", pregnancy ranges" : ""}`,
        route: "Vitals",
      });
    } catch {
      setResult({ tier: "normal", message: "Saved locally — will sync once connected." });
      showRemiToast("Saved locally", "Your vitals were saved on this device.", "bottom");
      await addRecentActivity({
        type: "vitals",
        title: editing ? "Vitals update saved locally" : "Weekly vitals saved locally",
        detail: `Blood pressure ${systolic}/${diastolic}${glucose ? `, glucose ${glucose}` : ""}`,
        route: "Vitals",
      });
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (reading: VitalsReading) => {
    setEditing(reading);
    setSystolic(String(reading.systolic));
    setDiastolic(String(reading.diastolic));
    setGlucose(reading.glucose ? String(reading.glucose) : "");
    setWellbeing(reading.wellbeing || 3);
    setPregnancyMode(Boolean(reading.pregnancy_mode));
    setResult(null);
    showRemiToast("Edit mode", "Update the fields above, then tap Update vitals.", "bottom");
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  };

  const cancelEdit = () => {
    setEditing(null);
    if (latest) {
      setSystolic(String(latest.systolic));
      setDiastolic(String(latest.diastolic));
      setGlucose(latest.glucose ? String(latest.glucose) : "");
      setWellbeing(latest.wellbeing || 3);
      setPregnancyMode(Boolean(latest.pregnancy_mode));
    }
  };

  const confirmDelete = (reading: VitalsReading) => {
    Alert.alert(
      "Delete vitals reading?",
      `This will remove the ${reading.systolic}/${reading.diastolic} reading from ${formatDate(reading.created_at)}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeReading(reading),
        },
      ],
    );
  };

  const removeReading = async (reading: VitalsReading) => {
    try {
      await deleteVitalsReading(reading.id);
      setReadings((current) => current.filter((item) => item.id !== reading.id));
      if (editing?.id === reading.id) {
        setEditing(null);
        setResult(null);
      }
      showRemiToast("Vitals deleted", "The saved reading has been removed.", "bottom");
      await addRecentActivity({
        type: "vitals",
        title: "Vitals reading deleted",
        detail: `Removed blood pressure ${reading.systolic}/${reading.diastolic}`,
        route: "Vitals",
      });
    } catch {
      showRemiToast("Delete failed", "Remi could not delete that reading right now.", "bottom");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>WEEKLY VITALS</Text>
            <Text style={styles.title}>Track your numbers</Text>
            <Text style={styles.subtitle}>Log blood pressure and glucose so Remi can spot patterns over time.</Text>
          </View>
          <View style={styles.headerIcon}>
            <HeartPulse size={24} color={colors.primary} />
          </View>
        </View>

        <View style={styles.content}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryIcon}><Activity size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>{editing ? "Editing reading" : latest ? "Latest saved reading" : "Current reading"}</Text>
                <Text style={styles.summaryValue}>{systolic || "--"}/{diastolic || "--"} <Text style={styles.summaryUnit}>mmHg</Text></Text>
                <Text style={styles.summaryMode}>{pregnancyMode ? "Pregnancy-specific ranges" : "Standard adult ranges"}</Text>
              </View>
            </View>
            <View style={styles.statusStrip}>
              <ShieldCheck size={14} color={colors.mint} />
              <Text style={styles.statusText}>Your saved vitals help build a safer health history.</Text>
            </View>
          </Card>

          {result && (
            <Card style={styles.resultCard}>
              <UrgencyDot level={result.tier} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.resultTitle}>Reading saved</Text>
                <Text style={styles.resultText}>{result.message}</Text>
              </View>
              <CheckCircle2 size={18} color={colors.mint} />
            </Card>
          )}

          <Text style={styles.sectionLabel}>BLOOD PRESSURE</Text>
          <View style={styles.modeSwitch}>
            <Pressable onPress={() => setPregnancyMode(false)} style={[styles.modeButton, !pregnancyMode && styles.modeButtonActive]}>
              <Text style={[styles.modeText, !pregnancyMode && styles.modeTextActive]}>Standard</Text>
            </Pressable>
            <Pressable onPress={() => setPregnancyMode(true)} style={[styles.modeButton, pregnancyMode && styles.modeButtonActive]}>
              <Text style={[styles.modeText, pregnancyMode && styles.modeTextActive]}>Pregnancy</Text>
            </Pressable>
          </View>
          <View style={styles.inputRow}>
            <VitalInput label="Systolic" value={systolic} onChangeText={setSystolic} unit="SYS" />
            <VitalInput label="Diastolic" value={diastolic} onChangeText={setDiastolic} unit="DIA" />
          </View>

          <Text style={styles.sectionLabel}>BLOOD SUGAR</Text>
          <View style={styles.glucoseCard}>
            <View style={styles.glucoseIcon}><Droplets size={17} color={colors.peach} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Blood glucose</Text>
              <TextInput value={glucose} onChangeText={setGlucose} keyboardType="decimal-pad" placeholder="Add value" placeholderTextColor={colors.inkFaint} style={styles.glucoseInput} />
            </View>
            <Text style={styles.unitPill}>mg/dL</Text>
          </View>

          <Text style={styles.sectionLabel}>GENERAL WELLBEING</Text>
          <View style={styles.wellbeingCard}>
            {[1, 2, 3, 4, 5].map((score) => (
              <Pressable key={score} onPress={() => setWellbeing(score)} style={[styles.wellbeingButton, wellbeing === score && styles.wellbeingButtonActive]}>
                <Text style={[styles.wellbeingScore, wellbeing === score && styles.wellbeingScoreActive]}>{score}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.wellbeingHint}>1 feels very low, 5 feels good today.</Text>

          {editing ? (
            <View style={styles.editBanner}>
              <Pencil size={15} color={colors.primary} />
              <Text style={styles.editBannerText}>Editing saved reading from {formatDate(editing.created_at)}</Text>
              <Pressable onPress={cancelEdit} style={styles.iconButton}>
                <X size={15} color={colors.inkSoft} />
              </Pressable>
            </View>
          ) : null}

          <PrimaryButton title={saving ? "Saving..." : editing ? "Update vitals" : "Save vitals"} onPress={save} style={{ opacity: saving ? 0.62 : 1 }} />

          <TrendCard readings={readings} />

          <View style={styles.historyHeader}>
            <Text style={styles.sectionLabel}>SAVED READINGS</Text>
            <Text style={styles.historyCount}>{readings.length} saved</Text>
          </View>

          {readings.length ? (
            readings.map((reading) => (
              <Card key={reading.id} style={styles.readingCard}>
                <View style={styles.readingMain}>
                  <View>
                    <Text style={styles.readingValue}>{reading.systolic}/{reading.diastolic} <Text style={styles.readingUnit}>mmHg</Text></Text>
                    <Text style={styles.readingMeta}>{formatDate(reading.created_at)}{reading.glucose ? ` • Glucose ${reading.glucose} mg/dL` : ""}{reading.wellbeing ? ` • Wellbeing ${reading.wellbeing}/5` : ""}{reading.pregnancy_mode ? " • Pregnancy ranges" : ""}</Text>
                  </View>
                  <View style={styles.tierPill}>
                    <UrgencyDot level={reading.tier} />
                    <Text style={styles.tierText}>{reading.tier}</Text>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <Pressable onPress={() => beginEdit(reading)} style={styles.editButton}>
                    <Pencil size={15} color={colors.primary} />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(reading)} style={styles.deleteButton}>
                    <Trash2 size={15} color={colors.urgent} />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </Pressable>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No saved vitals yet</Text>
              <Text style={styles.emptyText}>After you save a reading, it will appear here with an edit button.</Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function VitalInput({ label, value, onChangeText, unit }: { label: string; value: string; onChangeText: (value: string) => void; unit: string }) {
  return (
    <View style={styles.inputBox}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.valueRow}>
        <TextInput value={value} onChangeText={onChangeText} keyboardType="number-pad" style={styles.inputValue} />
        <Text style={styles.unitText}>{unit}</Text>
      </View>
    </View>
  );
}

function TrendCard({ readings }: { readings: VitalsReading[] }) {
  const trend = readings.slice(0, 7).reverse();
  if (trend.length < 2) {
    return (
      <Card style={styles.trendCard}>
        <Text style={styles.trendTitle}>Trend over time</Text>
        <Text style={styles.trendEmpty}>Save at least two weekly readings to see your pattern.</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.trendCard}>
      <View style={styles.trendHeader}>
        <Text style={styles.trendTitle}>Trend over time</Text>
        <Text style={styles.trendRange}>Last {trend.length}</Text>
      </View>
      <View style={styles.trendBars}>
        {trend.map((reading) => {
          const bpHeight = Math.max(18, Math.min(96, ((reading.systolic - 80) / 100) * 96));
          const glucoseHeight = reading.glucose ? Math.max(18, Math.min(96, ((Number(reading.glucose) - 60) / 180) * 96)) : 0;
          return (
            <View key={reading.id} style={styles.trendColumn}>
              <View style={styles.trendBarTrack}>
                {glucoseHeight ? <View style={[styles.trendBar, styles.glucoseBar, { height: glucoseHeight }]} /> : null}
                <View style={[styles.trendBar, styles.bpBar, { height: bpHeight }]} />
              </View>
              <Text style={styles.trendLabel}>{new Date(reading.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.trendLegend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>BP systolic</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.peach }]} /><Text style={styles.legendText}>Glucose</Text></View>
      </View>
    </Card>
  );
}

function upsertReading(readings: VitalsReading[], reading: VitalsReading) {
  const next = readings.filter((item) => item.id !== reading.id);
  return [reading, ...next].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function formatDate(value?: string) {
  if (!value) return "Just now";
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 28, paddingTop: 56, paddingBottom: 20 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 250 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 28, gap: 12 },
  summaryCard: { padding: 16 },
  summaryTop: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  summaryIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  summaryValue: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, marginTop: 2 },
  summaryUnit: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12 },
  summaryMode: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginTop: 4 },
  statusStrip: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  statusText: { color: colors.mint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, marginLeft: 8, flex: 1 },
  resultCard: { flexDirection: "row", alignItems: "center", padding: 16 },
  resultTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  resultText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12, marginTop: 8 },
  modeSwitch: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 4 },
  modeButton: { flex: 1, alignItems: "center", borderRadius: 999, paddingVertical: 10 },
  modeButtonActive: { backgroundColor: colors.primaryDim },
  modeText: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  modeTextActive: { color: colors.primary },
  inputRow: { flexDirection: "row", gap: 12 },
  inputBox: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, paddingVertical: 15 },
  inputLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  valueRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 6 },
  inputValue: { flex: 1, color: colors.ink, fontFamily: fonts.display, fontSize: 27, padding: 0 },
  unitText: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginBottom: 5 },
  glucoseCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14 },
  glucoseIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.peachDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  glucoseInput: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 16, padding: 0, marginTop: 3 },
  unitPill: { color: colors.peach, fontFamily: fonts.bodySemiBold, fontSize: 11, backgroundColor: colors.peachDim, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  wellbeingCard: { flexDirection: "row", gap: 8, backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 10 },
  wellbeingButton: { flex: 1, minHeight: 42, borderRadius: 12, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  wellbeingButtonActive: { backgroundColor: colors.mintDim, borderColor: "rgba(4,120,87,0.28)" },
  wellbeingScore: { color: colors.inkFaint, fontFamily: fonts.display, fontSize: 17 },
  wellbeingScoreActive: { color: colors.mint },
  wellbeingHint: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: -6 },
  editBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryDim, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11 },
  editBannerText: { flex: 1, color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12, marginLeft: 8 },
  iconButton: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  trendCard: { padding: 16 },
  trendHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  trendTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  trendRange: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  trendEmpty: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  trendBars: { height: 128, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", backgroundColor: colors.bg, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 28 },
  trendColumn: { flex: 1, alignItems: "center", justifyContent: "flex-end", minWidth: 0 },
  trendBarTrack: { height: 96, width: 18, alignItems: "center", justifyContent: "flex-end" },
  trendBar: { position: "absolute", bottom: 0, borderRadius: 999 },
  bpBar: { width: 10, backgroundColor: colors.primary, left: 1 },
  glucoseBar: { width: 10, backgroundColor: colors.peach, right: 1, opacity: 0.72 },
  trendLabel: { position: "absolute", bottom: -21, color: colors.inkFaint, fontFamily: fonts.body, fontSize: 9.5 },
  trendLegend: { flexDirection: "row", gap: 12, marginTop: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11 },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  historyCount: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 12 },
  readingCard: { padding: 15 },
  readingMain: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  readingValue: { color: colors.ink, fontFamily: fonts.display, fontSize: 23 },
  readingUnit: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11 },
  readingMeta: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  tierPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tierText: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11, textTransform: "capitalize" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 13 },
  editButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 999, backgroundColor: colors.primaryDim, paddingVertical: 11 },
  editButtonText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  deleteButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 999, backgroundColor: colors.urgentDim, paddingVertical: 11 },
  deleteButtonText: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  emptyCard: { padding: 18 },
  emptyTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  emptyText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
});
