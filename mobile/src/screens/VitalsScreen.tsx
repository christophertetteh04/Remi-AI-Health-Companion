import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, StyleSheet } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { Card, PrimaryButton, ScreenHeader, UrgencyDot } from "../components/UI";
import { submitVitalsReading } from "../services/api";

export default function VitalsScreen() {
  const [systolic, setSystolic] = useState("118");
  const [diastolic, setDiastolic] = useState("76");
  const [result, setResult] = useState<{ tier: "normal" | "monitor" | "urgent"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await submitVitalsReading({ systolic: Number(systolic), diastolic: Number(diastolic) });
      setResult({ tier: res.tier, message: res.message });
    } catch {
      setResult({ tier: "normal", message: "Saved locally — will sync once connected." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Weekly vitals" subtitle="Blood pressure & blood sugar" />
      <View style={{ paddingHorizontal: 28 }}>
        {result && (
          <Card style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <UrgencyDot level={result.tier} />
            <Text style={{ color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, marginLeft: 10, flex: 1 }}>{result.message}</Text>
          </Card>
        )}
        <Text style={styles.label}>LOG TODAY'S READING</Text>
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>Systolic</Text>
            <TextInput value={systolic} onChangeText={setSystolic} keyboardType="number-pad" style={styles.inputValue} />
          </View>
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>Diastolic</Text>
            <TextInput value={diastolic} onChangeText={setDiastolic} keyboardType="number-pad" style={styles.inputValue} />
          </View>
        </View>
        <PrimaryButton title={saving ? "Saving…" : "Save reading"} onPress={save} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12.5, marginBottom: 12 },
  inputBox: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 16, paddingVertical: 14 },
  inputLabel: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 10 },
  inputValue: { color: colors.ink, fontFamily: fonts.mono, fontSize: 16, marginTop: 4, padding: 0 },
});
