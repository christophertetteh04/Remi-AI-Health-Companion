import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { Activity, AlertTriangle, CalendarClock, Check, Download, FileText, FlaskConical, HeartPulse, Pill, Sparkles } from "lucide-react-native";
import { Card, PrimaryButton } from "../components/UI";
import SmoothEntrance from "../components/SmoothEntrance";
import DatePickerField from "../components/DatePickerField";
import { colors, fonts } from "../theme/tokens";
import { exportHealthSummaryPdf, generateDoctorPrepSummary, getCorrelationalInsights, getUnifiedTimeline } from "../services/api";

type TimelineItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  tier?: "normal" | "monitor" | "urgent";
  created_at: string;
};

export default function HealthOverviewScreen({ navigation }: any) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [visitDate, setVisitDate] = useState("");
  const [concern, setConcern] = useState("");
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [timelineData, insightData] = await Promise.all([getUnifiedTimeline(0, 30), getCorrelationalInsights()]);
      setTimeline(timelineData.items || []);
      setNextOffset(timelineData.nextOffset);
      setInsights(insightData.notes || []);
    } catch {
      setTimeline([]);
      setInsights([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (nextOffset == null) return;
    const data = await getUnifiedTimeline(nextOffset, 30);
    setTimeline((items) => [...items, ...(data.items || [])]);
    setNextOffset(data.nextOffset);
  };

  const generateSummary = async () => {
    setLoadingSummary(true);
    try {
      const data = await generateDoctorPrepSummary({ visitDate: visitDate.trim(), concern: concern.trim() });
      setSummary(data.summary || "");
    } catch {
      Alert.alert("Summary unavailable", "Remi could not generate the doctor-visit summary right now.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const fileUri = `${FileSystem.cacheDirectory}remi-health-summary.pdf`;
      const request = await exportHealthSummaryPdf({ visitDate: visitDate.trim(), concern: concern.trim() }, fileUri);
      await FileSystem.downloadAsync(request.url, request.fileUri, {
        headers: request.headers,
      });
      Alert.alert("Export ready", `Your PDF was saved to:\n${fileUri}`);
    } catch {
      Alert.alert("Export failed", "Remi could not export the health summary PDF right now.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 126 }} decelerationRate="fast" scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>HEALTH OVERVIEW</Text>
            <Text style={styles.title}>Your record, connected</Text>
            <Text style={styles.subtitle}>Timeline, descriptive patterns, visit prep, and exportable summaries in one privacy-scoped view.</Text>
          </View>
          <View style={styles.headerIcon}>
            <Sparkles size={24} color={colors.primary} />
          </View>
        </View>

        <View style={styles.content}>
          <SmoothEntrance>
            <Card style={styles.noticeCard}>
              <AlertTriangle size={17} color={colors.peach} />
              <Text style={styles.noticeText}>Remi summarizes what you logged. It does not diagnose, infer causes, or replace your clinician.</Text>
            </Card>
          </SmoothEntrance>

          <Text style={styles.sectionLabel}>CORRELATIONAL INSIGHTS</Text>
          {insights.length ? (
            insights.map((item, index) => (
              <SmoothEntrance key={item.title} delay={index * 45}>
                <Card style={styles.insightCard}>
                  <Sparkles size={17} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardText}>{item.description}</Text>
                    <Text style={styles.evidenceText}>{item.evidenceCount} comparable logs</Text>
                  </View>
                </Card>
              </SmoothEntrance>
            ))
          ) : (
            <SmoothEntrance>
              <Card style={styles.emptyCard}>
                <Text style={styles.cardTitle}>No consistent pattern yet</Text>
                <Text style={styles.cardText}>Remi will only surface descriptive correlations after enough comparable logs are available.</Text>
              </Card>
            </SmoothEntrance>
          )}

          <Text style={styles.sectionLabel}>DOCTOR-VISIT PREP</Text>
          <SmoothEntrance delay={60}>
            <Card style={styles.formCard}>
              <DatePickerField label="Visit date" value={visitDate} onChange={setVisitDate} placeholder="Select visit date" optional />
              <Input label="Main concern" value={concern} onChangeText={setConcern} placeholder="What do you want to discuss?" multiline />
              <PrimaryButton title={loadingSummary ? "Generating..." : "Generate prep summary"} onPress={generateSummary} />
              {summary ? <Text style={styles.summaryText}>{summary}</Text> : null}
              <Pressable onPress={exportPdf} style={styles.exportButton}>
                <Download size={16} color={colors.primary} />
                <Text style={styles.exportText}>{exporting ? "Exporting..." : "Export health summary"}</Text>
              </Pressable>
            </Card>
          </SmoothEntrance>

          <Text style={styles.sectionLabel}>UNIFIED TIMELINE</Text>
          {timeline.length ? (
            timeline.map((item, index) => <TimelineRow key={`${item.type}-${item.id}`} item={item} index={index} />)
          ) : (
            <SmoothEntrance>
              <Card style={styles.emptyCard}>
                <Text style={styles.cardTitle}>No timeline events yet</Text>
                <Text style={styles.cardText}>Symptoms, labs, medications, vitals, conditions, lifestyle, and visit outcomes will appear here.</Text>
              </Card>
            </SmoothEntrance>
          )}
          {nextOffset != null ? (
            <Pressable onPress={loadMore} style={styles.loadMore}>
              <Text style={styles.loadMoreText}>Load more</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function TimelineRow({ item, index }: { item: TimelineItem; index: number }) {
  const Icon = iconFor(item.type);
  const color = item.tier ? tierColor(item.tier) : typeColor(item.type);
  return (
    <SmoothEntrance delay={Math.min(index, 8) * 35}>
      <Card style={styles.timelineCard}>
        <View style={[styles.timelineIcon, { backgroundColor: `${color}16` }]}>
          <Icon size={17} color={color} />
        </View>
        <View style={styles.timelineCopy}>
          <View style={styles.timelineTop}>
            <Text style={styles.cardTitle} numberOfLines={3}>{item.title}</Text>
            <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.cardText}>{item.detail}</Text>
        </View>
      </Card>
    </SmoothEntrance>
  );
}

function Input({ label, value, onChangeText, placeholder, multiline }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean }) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.inkFaint} multiline={multiline} style={[styles.input, multiline && styles.inputMultiline]} />
    </View>
  );
}

function iconFor(type: string): any {
  if (type === "lab" || type === "imaging") return FlaskConical;
  if (type === "medication") return Pill;
  if (type === "vitals") return Activity;
  if (type === "condition") return HeartPulse;
  if (type === "cycle" || type === "menopause") return CalendarClock;
  return FileText;
}

function tierColor(tier: "normal" | "monitor" | "urgent") {
  if (tier === "urgent") return colors.urgent;
  if (tier === "monitor") return colors.peach;
  return colors.mint;
}

function typeColor(type: string) {
  if (type === "medication") return colors.primary;
  if (type === "lifestyle") return colors.mint;
  if (type === "pain") return colors.urgent;
  return colors.peach;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6 },
  headerIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  content: { paddingHorizontal: 20, gap: 12 },
  noticeCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, padding: 14 },
  noticeText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 10, flex: 1 },
  sectionLabel: { color: colors.inkSoft, fontFamily: fonts.bodySemiBold, fontSize: 11.5, marginTop: 10 },
  insightCard: { flexDirection: "row", gap: 11, padding: 15 },
  emptyCard: { padding: 16 },
  cardTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 19, flexShrink: 1 },
  cardText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  evidenceText: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginTop: 8 },
  formCard: { padding: 16 },
  inputWrap: { marginBottom: 12 },
  label: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  input: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, paddingHorizontal: 14, paddingVertical: 12 },
  inputMultiline: { minHeight: 82, textAlignVertical: "top" },
  summaryText: { color: colors.ink, fontFamily: fonts.body, fontSize: 13, lineHeight: 20, marginTop: 14 },
  exportButton: { minHeight: 46, borderRadius: 999, backgroundColor: colors.primaryDim, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12, paddingHorizontal: 14 },
  exportText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  timelineCard: { flexDirection: "row", alignItems: "flex-start", padding: 14 },
  timelineIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 11, flexShrink: 0 },
  timelineCopy: { flex: 1, minWidth: 0 },
  timelineTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  dateText: { color: colors.inkFaint, fontFamily: fonts.bodyMedium, fontSize: 11, flexShrink: 0, marginTop: 2 },
  loadMore: { alignItems: "center", paddingVertical: 14 },
  loadMoreText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 13 },
});
