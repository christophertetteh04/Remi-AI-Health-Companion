import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { ArrowLeft, Download, FileText, LockKeyhole, ShieldCheck } from "lucide-react-native";
import { colors, fonts, spacing } from "../theme/tokens";
import { PrimaryButton } from "../components/UI";
import DatePickerField from "../components/DatePickerField";
import { exportHealthSummaryPdf, generateDoctorPrepSummary } from "../services/api";

export default function ExportHealthDataScreen({ navigation }: any) {
  const [visitDate, setVisitDate] = useState("");
  const [concern, setConcern] = useState("");
  const [summary, setSummary] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);

  const previewSummary = async () => {
    setLoadingPreview(true);
    try {
      const data = await generateDoctorPrepSummary({ visitDate: visitDate.trim(), concern: concern.trim() });
      setSummary(data.summary || "");
    } catch {
      Alert.alert("Preview unavailable", "Remi could not prepare the export preview right now.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const fileUri = `${FileSystem.cacheDirectory}remi-health-export-${stamp}.pdf`;
      const request = await exportHealthSummaryPdf({ visitDate: visitDate.trim(), concern: concern.trim() }, fileUri);
      await FileSystem.downloadAsync(request.url, request.fileUri, { headers: request.headers });
      Alert.alert("Export ready", `Your health summary PDF was saved to:\n${fileUri}`);
    } catch {
      Alert.alert("Export failed", "Remi could not export your health data right now.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.ink} />
        </Pressable>
        <View style={styles.badge}>
          <Download size={13} color={colors.primary} />
          <Text style={styles.badgeText}>Export</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <FileText size={28} color={colors.primary} />
        </View>
        <Text style={styles.eyebrow}>HEALTH DATA</Text>
        <Text style={styles.title}>Export health data</Text>
        <Text style={styles.subtitle}>Create a clinician-friendly PDF with your recent summary, current medications, and recent vitals.</Text>
      </View>

      <View style={styles.privacyCard}>
        <ShieldCheck size={17} color={colors.mint} />
        <Text style={styles.privacyText}>Only your signed-in account data is included. The export is descriptive and non-diagnostic.</Text>
      </View>

      <View style={styles.formCard}>
        <DatePickerField label="Visit date" value={visitDate} onChange={setVisitDate} placeholder="Select visit date" optional />

        <View style={styles.inputWrap}>
          <Text style={styles.label}>Main concern</Text>
          <TextInput
            value={concern}
            onChangeText={setConcern}
            placeholder="Optional note for the summary"
            placeholderTextColor={colors.inkFaint}
            multiline
            style={[styles.input, styles.textArea]}
          />
        </View>

        <PrimaryButton title={loadingPreview ? "Preparing preview..." : "Preview summary"} onPress={previewSummary} />

        {summary ? (
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>PREVIEW</Text>
            <Text style={styles.previewText}>{summary}</Text>
          </View>
        ) : null}

        <Pressable onPress={exportPdf} style={styles.exportButton}>
          <Download size={17} color={colors.bg} />
          <Text style={styles.exportButtonText}>{exporting ? "Exporting..." : "Export PDF"}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <LockKeyhole size={15} color={colors.primary} />
        <Text style={styles.footerText}>Review the PDF before sharing it with a clinician or specialist.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.xl, paddingTop: 54, paddingBottom: 34 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, alignItems: "center", justifyContent: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11.5 },
  hero: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 18, marginBottom: 12 },
  heroIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  privacyCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mintDim, borderRadius: 12, padding: 14, marginBottom: 12 },
  privacyText: { color: colors.mint, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginLeft: 10, flex: 1 },
  formCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16 },
  inputWrap: { marginBottom: 12 },
  label: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  inputIconRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 12 },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 13.5, paddingVertical: 12, paddingHorizontal: 10 },
  textArea: { minHeight: 86, textAlignVertical: "top", backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 14 },
  preview: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 14, marginTop: 12 },
  previewLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginBottom: 7 },
  previewText: { color: colors.ink, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19 },
  exportButton: { minHeight: 50, borderRadius: 999, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14 },
  exportButtonText: { color: colors.bg, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  footer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryDim, borderRadius: 12, padding: 14, marginTop: 12 },
  footerText: { color: colors.primary, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginLeft: 9, flex: 1 },
});
