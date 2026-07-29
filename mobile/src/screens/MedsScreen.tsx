import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { colors, radius, fonts } from "../theme/tokens";
import { Card, PrimaryButton } from "../components/UI";
import { Pill, Check, AlertTriangle, Camera, ImageUp, Bell, ShieldCheck, Plus, Clock3 } from "lucide-react-native";
import { getMedications, markMedicationTaken } from "../services/api";
import { addRecentActivity } from "../services/recentActivity";
import { navigationRef } from "../navigation/navigationRef";

type Medication = {
  id: string;
  name: string;
  dose: string;
  time: string;
  note: string;
  takenToday: boolean;
  source?: string;
  conversation_ref?: string | null;
  created_at?: string;
};

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

  const takenCount = meds.filter((m) => m.takenToday).length;
  const nextMed = meds.find((m) => !m.takenToday);
  const openPrescriptionScan = (source?: "camera" | "library") => {
    const params = source ? { source } : undefined;
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate("PrescriptionScan", params);
      return;
    }
    navigation.navigate("PrescriptionScan", params);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 148 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MEDICATIONS</Text>
            <Text style={styles.title}>Your daily meds</Text>
            <Text style={styles.subtitle}>Prescriptions, doses, and reminders in one place.</Text>
          </View>
          <Pressable onPress={() => openPrescriptionScan()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Add prescription" style={styles.headerIcon}>
            <Plus size={24} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View style={styles.summaryIcon}><Bell size={18} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Today</Text>
                <Text style={styles.summaryTitle}>{loading ? "Checking reminders..." : nextMed ? `Next: ${nextMed.name}` : "No doses pending"}</Text>
              </View>
            </View>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryNumber}>{meds.length}</Text>
                <Text style={styles.summaryStatLabel}>Active meds</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryNumber}>{takenCount}</Text>
                <Text style={styles.summaryStatLabel}>Taken today</Text>
              </View>
            </View>
          </View>

          {loading && (
            <Card style={styles.loadingCard}>
              <Text style={styles.loadingText}>Loading your medications...</Text>
            </Card>
          )}

          {!loading && meds.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Plus size={20} color={colors.primary} /></View>
              <Text style={styles.emptyTitle}>No medications yet</Text>
              <Text style={styles.emptyText}>Add your first prescription from a photo or uploaded image. Remi will help turn it into a reminder you can review.</Text>
              <PrimaryButton title="Add prescription" onPress={() => openPrescriptionScan()} style={styles.emptyButton} />
            </View>
          )}

          {meds.map((m) => (
            <Card key={m.id} style={styles.medCard}>
              <View style={styles.medHeader}>
                <View style={styles.pillIcon}><Pill size={17} color={colors.primary} /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.medName}>{m.name}</Text>
                  <Text style={styles.medDose}>{m.dose}</Text>
                  {m.source === "chat" ? <SourceBadge date={m.conversation_ref || m.created_at} /> : null}
                </View>
                <View style={styles.timePill}>
                  <Clock3 size={12} color={colors.inkSoft} />
                  <Text style={styles.medTime}>{m.time}</Text>
                </View>
              </View>
              {m.note ? <Text style={styles.medNote}>{m.note}</Text> : null}
              <Pressable onPress={() => markTaken(m.id)} style={[styles.takenBtn, m.takenToday && styles.takenBtnDone]}>
                <Check size={12} color={m.takenToday ? colors.mint : colors.inkSoft} />
                <Text style={[styles.takenText, m.takenToday && { color: colors.mint }]}>
                  {m.takenToday ? "Taken today" : "Mark as taken"}
                </Text>
              </Pressable>
            </Card>
          ))}

          <View style={styles.allergyNote}>
            <ShieldCheck size={16} color={colors.mint} />
            <Text style={styles.allergyText}>
              <Text style={{ fontFamily: fonts.bodySemiBold }}>Safety check: </Text>
              Remi will flag listed allergies or conflicts when prescription details are available.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.uploadTitle}>New prescription</Text>
          <Text style={styles.uploadText}>Camera or image upload</Text>
        </View>
        <View style={styles.uploadActions}>
          <Pressable onPress={() => openPrescriptionScan("camera")} style={styles.uploadButton}>
            <Camera size={17} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Camera</Text>
          </Pressable>
          <Pressable onPress={() => openPrescriptionScan("library")} style={styles.uploadButton}>
            <ImageUp size={17} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SourceBadge({ date }: { date?: string | null }) {
  const label = date ? new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "your check-in";
  return <Text style={styles.sourceBadge}>From your check-in on {label}</Text>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 20,
  },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 250 },
  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 28, gap: 12 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  summaryTop: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  summaryIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  summaryTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 16, marginTop: 3 },
  summaryStats: { flexDirection: "row", backgroundColor: colors.bg, borderRadius: 10, paddingVertical: 12 },
  summaryStat: { flex: 1, alignItems: "center" },
  summaryNumber: { color: colors.ink, fontFamily: fonts.display, fontSize: 23 },
  summaryStatLabel: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  summaryDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
  loadingCard: { padding: 16 },
  loadingText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 13 },
  bottomBar: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  emptyState: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", paddingHorizontal: 22, paddingVertical: 28 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 16 },
  emptyText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: 7 },
  emptyButton: { alignSelf: "stretch", marginTop: 16 },
  uploadTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  uploadText: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 3 },
  uploadActions: { flexDirection: "row", gap: 8 },
  uploadButton: { width: 74, height: 54, borderRadius: 10, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  uploadButtonText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginTop: 4 },
  medCard: { padding: 16 },
  medHeader: { flexDirection: "row", alignItems: "center" },
  pillIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  medName: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  medDose: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  sourceBadge: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginTop: 5 },
  timePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.surfaceRaised, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  medTime: { color: colors.inkSoft, fontFamily: fonts.mono, fontSize: 11 },
  medNote: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 12 },
  takenBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, marginTop: 14, alignSelf: "stretch" },
  takenBtnDone: { backgroundColor: colors.mintDim },
  takenText: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 12, marginLeft: 7 },
  allergyNote: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.mintDim, borderRadius: 12, padding: 16, marginTop: 2 },
  allergyText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 17 },
});
