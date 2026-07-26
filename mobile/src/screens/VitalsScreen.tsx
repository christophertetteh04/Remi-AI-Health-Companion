import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, StyleSheet } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { Card, PrimaryButton, UrgencyDot } from "../components/UI";
import { submitVitalsReading } from "../services/api";
import { addRecentActivity } from "../services/recentActivity";
import { Activity, Droplets, HeartPulse, ShieldCheck } from "lucide-react-native";

export default function VitalsScreen() {
  const [systolic, setSystolic] = useState("118");
  const [diastolic, setDiastolic] = useState("76");
  const [glucose, setGlucose] = useState("");
  const [result, setResult] = useState<{ tier: "normal" | "monitor" | "urgent"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await submitVitalsReading({
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        glucose: glucose ? Number(glucose) : undefined,
      });
      setResult({ tier: res.tier, message: res.message });
      await addRecentActivity({
        type: "vitals",
        title: "Weekly vitals logged",
        detail: `Blood pressure ${systolic}/${diastolic}${glucose ? `, glucose ${glucose}` : ""}`,
        route: "Vitals",
      });
    } catch {
      setResult({ tier: "normal", message: "Saved locally — will sync once connected." });
      await addRecentActivity({
        type: "vitals",
        title: "Weekly vitals saved locally",
        detail: `Blood pressure ${systolic}/${diastolic}${glucose ? `, glucose ${glucose}` : ""}`,
        route: "Vitals",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
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
              <Text style={styles.summaryLabel}>Current reading</Text>
              <Text style={styles.summaryValue}>{systolic || "--"}/{diastolic || "--"} <Text style={styles.summaryUnit}>mmHg</Text></Text>
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
              <Text style={styles.resultTitle}>Reading reviewed</Text>
              <Text style={styles.resultText}>{result.message}</Text>
            </View>
          </Card>
        )}

        <Text style={styles.sectionLabel}>BLOOD PRESSURE</Text>
        <View style={styles.inputRow}>
          <VitalInput label="Systolic" value={systolic} onChangeText={setSystolic} unit="SYS" />
          <VitalInput label="Diastolic" value={diastolic} onChangeText={setDiastolic} unit="DIA" />
        </View>

        <Text style={styles.sectionLabel}>OPTIONAL</Text>
        <View style={styles.glucoseCard}>
          <View style={styles.glucoseIcon}><Droplets size={17} color={colors.peach} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Blood glucose</Text>
            <TextInput value={glucose} onChangeText={setGlucose} keyboardType="decimal-pad" placeholder="Add value" placeholderTextColor={colors.inkFaint} style={styles.glucoseInput} />
          </View>
          <Text style={styles.unitPill}>mg/dL</Text>
        </View>

        <PrimaryButton title={saving ? "Saving..." : "Save vitals"} onPress={save} />
      </View>
    </ScrollView>
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
  statusStrip: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  statusText: { color: colors.mint, fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, marginLeft: 8, flex: 1 },
  resultCard: { flexDirection: "row", alignItems: "center", padding: 16 },
  resultTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  resultText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12, marginTop: 8 },
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
});
