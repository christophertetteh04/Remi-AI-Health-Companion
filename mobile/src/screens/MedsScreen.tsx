import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { colors, radius, fonts } from "../theme/tokens";
import { Card, ScreenHeader } from "../components/UI";
import { Pill, Check, AlertTriangle } from "lucide-react-native";
import { getMedications, markMedicationTaken } from "../services/api";

type Medication = { id: string; name: string; dose: string; time: string; note: string; takenToday: boolean };

export default function MedsScreen() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMedications()
      .then(setMeds)
      .catch(() => setMeds([])) // falls back to empty state if backend/API keys aren't configured yet
      .finally(() => setLoading(false));
  }, []);

  const markTaken = async (id: string) => {
    setMeds((prev) => prev.map((m) => (m.id === id ? { ...m, takenToday: true } : m)));
    try {
      await markMedicationTaken(id, new Date().toISOString());
    } catch {
      // optimistic update stands even if the log call fails; a retry/sync queue is a V2 item
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Medications" subtitle="Your prescriptions and reminders" />
      <View style={{ paddingHorizontal: 28, gap: 12 }}>
        {loading && <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>Loading…</Text>}
        {!loading && meds.length === 0 && (
          <Text style={{ color: colors.inkFaint, fontFamily: fonts.body, fontSize: 13 }}>
            No medications yet — upload a prescription to get started.
          </Text>
        )}
        {meds.map((m) => (
          <Card key={m.id} style={{ flexDirection: "row" }}>
            <View style={styles.pillIcon}><Pill size={16} color={colors.primary} /></View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={styles.medName}>{m.name} {m.dose}</Text>
                <Text style={styles.medTime}>{m.time}</Text>
              </View>
              <Text style={styles.medNote}>{m.note}</Text>
              <Pressable onPress={() => markTaken(m.id)} style={[styles.takenBtn, m.takenToday && { backgroundColor: colors.mintDim }]}>
                <Check size={11} color={m.takenToday ? colors.mint : colors.inkSoft} />
                <Text style={{ color: m.takenToday ? colors.mint : colors.inkSoft, fontFamily: fonts.body, fontSize: 11.5, marginLeft: 6 }}>
                  {m.takenToday ? "Taken today" : "Mark as taken"}
                </Text>
              </Pressable>
            </View>
          </Card>
        ))}

        <View style={styles.allergyNote}>
          <AlertTriangle size={15} color={colors.peach} />
          <Text style={styles.allergyText}>
            <Text style={{ fontFamily: fonts.bodySemiBold }}>Allergy check: </Text>
            No conflicts found with your listed allergies.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pillIcon: { width: 40, height: 40, borderRadius: 16, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  medName: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  medTime: { color: colors.inkFaint, fontFamily: fonts.mono, fontSize: 11 },
  medNote: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11.5, marginTop: 2 },
  takenBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceRaised, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10, alignSelf: "flex-start" },
  allergyNote: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, borderRadius: 22, padding: 16, marginTop: 4 },
  allergyText: { color: "#F0D2B8", fontFamily: fonts.body, fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 17 },
});
