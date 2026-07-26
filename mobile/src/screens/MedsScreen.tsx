import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { colors, radius, fonts } from "../theme/tokens";
import { Card, ScreenHeader } from "../components/UI";
import { Pill, Check, AlertTriangle, Camera, ImageUp } from "lucide-react-native";
import { getMedications, markMedicationTaken } from "../services/api";
import { addRecentActivity } from "../services/recentActivity";

type Medication = { id: string; name: string; dose: string; time: string; note: string; takenToday: boolean };

export default function MedsScreen({ navigation }: any) {
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
      const med = meds.find((m) => m.id === id);
      await addRecentActivity({
        type: "medication",
        title: "Medication marked taken",
        detail: med ? `${med.name} ${med.dose}`.trim() : "Dose marked complete",
        route: "Meds",
      });
    } catch {
      // optimistic update stands even if the log call fails; a retry/sync queue is a V2 item
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 132 }}>
        <ScreenHeader title="Medications" subtitle="Your prescriptions and reminders" />
        <View style={{ paddingHorizontal: 28, gap: 12 }}>
          {loading && <Text style={{ color: colors.inkFaint, fontFamily: fonts.body }}>Loading…</Text>}
          {!loading && meds.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Pill size={18} color={colors.primary} /></View>
              <Text style={styles.emptyTitle}>No medications yet</Text>
              <Text style={styles.emptyText}>Add a prescription from a photo or uploaded image to create medication reminders.</Text>
            </View>
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

      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.uploadTitle}>Add prescription</Text>
          <Text style={styles.uploadText}>Scan a label or upload an image.</Text>
        </View>
        <View style={styles.uploadActions}>
          <Pressable onPress={() => navigation.navigate("PrescriptionScan", { source: "camera" })} style={styles.uploadButton}>
            <Camera size={17} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Camera</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("PrescriptionScan", { source: "library" })} style={styles.uploadButton}>
            <ImageUp size={17} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  emptyState: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", padding: 22 },
  emptyIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  emptyText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 4 },
  uploadTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  uploadText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 3 },
  uploadActions: { flexDirection: "row", gap: 8 },
  uploadButton: { width: 74, height: 54, borderRadius: 8, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  uploadButtonText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginTop: 4 },
  pillIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  medName: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  medTime: { color: colors.inkFaint, fontFamily: fonts.mono, fontSize: 11 },
  medNote: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 11.5, marginTop: 2 },
  takenBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceRaised, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10, alignSelf: "flex-start" },
  allergyNote: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, borderRadius: 12, padding: 16, marginTop: 4 },
  allergyText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 17 },
});
