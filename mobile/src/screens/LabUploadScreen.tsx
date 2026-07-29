import React, { useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, fonts } from "../theme/tokens";
import { Card, PrimaryButton } from "../components/UI";
import { Camera, CheckCircle2, ChevronRight, FileImage, ImagePlus, Sparkles, UploadCloud } from "lucide-react-native";
import { addRecentActivity } from "../services/recentActivity";
import { authHeader } from "../services/api";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";

type LabResult = {
  testType: string;
  explanation: string;
  keyResults: { name: string; value: string; flag: string }[];
  comparison: string | null;
};

export default function LabUploadScreen({ navigation }: any) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LabResult | null>(null);
  const [error, setError] = useState("");

  const pickAndUpload = async (fromCamera: boolean) => {
    const picker = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const picked = await picker({ base64: true, quality: 0.7 });
    if (picked.canceled) return;

    setImageUri(picked.assets[0].uri);
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/labs/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ imageBase64: picked.assets[0].base64, mediaType: "image/jpeg" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data);
      await addRecentActivity({
        type: "lab",
        title: "Lab result uploaded",
        detail: data?.testType ? `${data.testType} was reviewed` : "Report was reviewed",
        route: "DailyInsights",
      });
    } catch {
      setError("We couldn't read that report — please try a clearer photo, or add it later.");
    } finally {
      setLoading(false);
    }
  };

  const flagColor = (flag: string) => (flag === "out_of_range" ? colors.peach : flag === "normal" ? colors.mint : colors.inkFaint);
  const flagLabel = (flag: string) => (flag === "out_of_range" ? "Review" : flag === "normal" ? "Normal" : "Logged");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>LAB REPORT</Text>
          <Text style={styles.title}>Review your results</Text>
          <Text style={styles.subtitle}>Upload a clear photo and Remi will summarize the report in plain language for clinician review.</Text>
        </View>
        <View style={styles.headerIcon}>
          <FileImage size={24} color={colors.primary} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.uploadPanel}>
          <View style={styles.uploadIcon}>
            {imageUri ? <CheckCircle2 size={24} color={colors.mint} /> : <UploadCloud size={24} color={colors.primary} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.uploadTitle}>{imageUri ? "Report attached" : "Add a lab report"}</Text>
            <Text style={styles.uploadText}>{imageUri ? "You can replace the image with a clearer copy anytime." : "Use a bright, uncropped image so result names and values are readable."}</Text>
          </View>
        </View>

        <View style={styles.actionGrid}>
          <ActionButton icon={Camera} title="Camera" detail="Take photo" onPress={() => pickAndUpload(true)} />
          <ActionButton icon={ImagePlus} title="Library" detail="Choose image" onPress={() => pickAndUpload(false)} />
        </View>

        {imageUri && (
          <View style={styles.previewWrap}>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <View style={styles.previewBadge}>
              <FileImage size={12} color={colors.primary} />
              <Text style={styles.previewBadgeText}>Ready to review</Text>
            </View>
          </View>
        )}

        {loading && (
          <View style={styles.statusCard}>
            <View style={styles.loadingDot} />
            <Text style={styles.loading}>Reading your report...</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not read report</Text>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        {result && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.sectionLabel}>SUMMARY</Text>
                <Text style={styles.testType}>{result.testType}</Text>
              </View>
              <View style={styles.reviewPill}>
                <Sparkles size={13} color={colors.primary} />
                <Text style={styles.reviewPillText}>Reviewed</Text>
              </View>
            </View>

            <Card style={styles.explanationCard}>
              <Text style={styles.explanation}>{result.explanation}</Text>
            </Card>

            {result.keyResults?.length > 0 && (
              <View style={styles.resultsList}>
                <Text style={styles.sectionLabel}>KEY RESULTS</Text>
                {result.keyResults.map((r, i) => (
                  <View key={i} style={styles.resultRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{r.name}</Text>
                      <Text style={[styles.resultFlag, { color: flagColor(r.flag) }]}>{flagLabel(r.flag)}</Text>
                    </View>
                    <Text style={[styles.resultValue, { color: flagColor(r.flag) }]}>{r.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {result.comparison && (
              <View style={styles.comparisonCard}>
                <Sparkles size={16} color={colors.peach} />
                <Text style={styles.comparisonText}>{result.comparison}</Text>
              </View>
            )}

            <View style={styles.doneWrap}>
              <PrimaryButton title="Done" onPress={() => navigation.goBack()} />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ActionButton({ icon: Icon, title, detail, onPress }: { icon: any; title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton}>
      <View style={styles.actionIcon}>
        <Icon size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDetail}>{detail}</Text>
      </View>
      <ChevronRight size={16} color={colors.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 36 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 28, paddingTop: 56, paddingBottom: 20 },
  eyebrow: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 7 },
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 270 },
  headerIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 28, gap: 12 },
  uploadPanel: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 16 },
  uploadIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 12 },
  uploadTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 15 },
  uploadText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  actionGrid: { gap: 10 },
  actionButton: { minHeight: 64, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, padding: 13 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center", marginRight: 11 },
  actionTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  actionDetail: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 2 },
  previewWrap: { position: "relative", overflow: "hidden", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surface },
  preview: { width: "100%", height: 220 },
  previewBadge: { position: "absolute", left: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255, 255, 255, 0.94)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  previewBadgeText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  statusCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryDim, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12 },
  loadingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: 9 },
  loading: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 12.5 },
  errorCard: { backgroundColor: colors.urgentDim, borderRadius: 12, padding: 14 },
  errorTitle: { color: colors.urgent, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  error: { color: colors.urgent, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  resultSection: { gap: 12, marginTop: 4 },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 6 },
  testType: { color: colors.ink, fontFamily: fonts.display, fontSize: 20 },
  reviewPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryDim, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  reviewPillText: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 11 },
  explanationCard: { padding: 16 },
  explanation: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  resultsList: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, paddingHorizontal: 14, paddingTop: 14 },
  resultRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  resultName: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  resultFlag: { fontFamily: fonts.bodyMedium, fontSize: 11.5, marginTop: 3 },
  resultValue: { fontFamily: fonts.mono, fontSize: 13, textAlign: "right", maxWidth: 130 },
  comparisonCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, borderRadius: 12, padding: 14 },
  comparisonText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 17 },
  doneWrap: { marginTop: 4 },
});
