import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, fonts } from "../theme/tokens";
import { Card, PrimaryButton, GhostButton, ScreenHeader } from "../components/UI";
import { authHeader } from "../services/api";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
const SCAN_TYPES = ["X-ray", "CT", "MRI", "Ultrasound"];
type ImagingRecord = {
  id: string;
  kind: "report_text" | "scan_image";
  scan_type?: string;
  created_at?: string;
  source?: string;
  conversation_ref?: string | null;
  explanation?: string | null;
};

export default function ImagingUploadScreen({ navigation }: any) {
  const [kind, setKind] = useState<"report_text" | "scan_image" | null>(null);
  const [scanType, setScanType] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ explanation?: string; message?: string } | null>(null);
  const [records, setRecords] = useState<ImagingRecord[]>([]);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/imaging`, { headers: await authHeader() });
      if (res.ok) setRecords(await res.json());
    } catch {
      setRecords([]);
    }
  };

  const capture = async () => {
    const picked = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (picked.canceled) return;
    setImageUri(picked.assets[0].uri);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/imaging/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ imageBase64: picked.assets[0].base64, kind, scanType }),
      });
      setResult(await res.json());
      await loadRecords();
    } catch {
      setResult({ message: "We couldn't save that just now — please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Step 1: what kind of image is this — asked directly, not guessed.
  if (!kind) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 28, paddingTop: 60 }}>
        <ScreenHeader title="Add a scan or report" subtitle="Which do you have?" />
        <View style={{ gap: 12 }}>
          <PrimaryButton title="A written radiology report" onPress={() => setKind("report_text")} />
          <GhostButton title="The scan image itself (X-ray/CT/MRI/ultrasound)" onPress={() => setKind("scan_image")} />
        </View>
        <Text style={styles.hint}>
          We only explain written reports in plain language. Scan images are saved to your record for your doctor — we don't interpret them.
        </Text>
      </View>
    );
  }

  // Step 2 (scan_image only): what type of scan, for labeling.
  if (kind === "scan_image" && !scanType) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 28, paddingTop: 60 }}>
        <ScreenHeader title="What type of scan?" />
        <View style={{ gap: 10 }}>
          {SCAN_TYPES.map((t) => (
            <GhostButton key={t} title={t} onPress={() => setScanType(t)} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title={kind === "report_text" ? "Radiology report" : `${scanType} scan`} />
      <View style={{ paddingHorizontal: 28 }}>
        {!imageUri && <PrimaryButton title="Take a photo" onPress={capture} />}
        {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}
        {loading && <Text style={styles.loading}>Saving…</Text>}
        {result && (
          <View style={{ marginTop: 16 }}>
            {result.explanation && (
              <Card>
                <Text style={styles.text}>{result.explanation}</Text>
              </Card>
            )}
            {result.message && <Text style={styles.text}>{result.message}</Text>}
            <View style={{ marginTop: 16 }}>
              <PrimaryButton title="Done" onPress={() => navigation.goBack()} />
            </View>
          </View>
        )}
        {records.length > 0 && (
          <View style={styles.recordsSection}>
            <Text style={styles.sectionLabel}>RECENT IMAGING</Text>
            {records.slice(0, 6).map((record) => (
              <Card key={record.id} style={styles.recordCard}>
                <Text style={styles.recordTitle}>{record.scan_type || (record.kind === "scan_image" ? "Scan image" : "Radiology report")}</Text>
                <Text style={styles.recordText}>{record.kind === "scan_image" ? "Image saved for clinician review" : record.explanation || "Report saved"}</Text>
                {record.source === "chat" ? <SourceBadge date={record.conversation_ref || record.created_at} /> : null}
              </Card>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function SourceBadge({ date }: { date?: string | null }) {
  const label = date ? new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "your check-in";
  return <Text style={styles.sourceBadge}>From your check-in on {label}</Text>;
}

const styles = StyleSheet.create({
  preview: { width: "100%", height: 200, borderRadius: 12, marginTop: 16 },
  loading: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5, marginTop: 12 },
  text: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  hint: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 11.5, marginTop: 20, lineHeight: 16 },
  recordsSection: { marginTop: 22, gap: 10 },
  sectionLabel: { color: colors.inkFaint, fontFamily: fonts.bodySemiBold, fontSize: 11, marginBottom: 2 },
  recordCard: { padding: 14 },
  recordTitle: { color: colors.ink, fontFamily: fonts.bodySemiBold, fontSize: 13.5 },
  recordText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 5 },
  sourceBadge: { color: colors.primary, fontFamily: fonts.bodySemiBold, fontSize: 10.5, marginTop: 8 },
});
