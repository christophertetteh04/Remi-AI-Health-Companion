import React, { useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors, fonts } from "../theme/tokens";
import { Card, PrimaryButton, GhostButton, ScreenHeader } from "../components/UI";
import { Sparkles } from "lucide-react-native";
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader title="Lab report" subtitle="We'll explain it in plain language — not a diagnosis" />
      <View style={{ paddingHorizontal: 28 }}>
        {!imageUri && (
          <View style={{ gap: 10 }}>
            <PrimaryButton title="Take a photo" onPress={() => pickAndUpload(true)} />
            <GhostButton title="Choose from library" onPress={() => pickAndUpload(false)} />
          </View>
        )}
        {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}
        {loading && <Text style={styles.loading}>Reading your report…</Text>}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.testType}>{result.testType}</Text>
            <Card style={{ marginTop: 10 }}>
              <Text style={styles.explanation}>{result.explanation}</Text>
            </Card>

            {result.keyResults?.length > 0 && (
              <View style={{ marginTop: 14 }}>
                {result.keyResults.map((r, i) => (
                  <View key={i} style={styles.resultRow}>
                    <Text style={styles.resultName}>{r.name}</Text>
                    <Text style={[styles.resultValue, { color: flagColor(r.flag) }]}>{r.value}</Text>
                  </View>
                ))}
              </View>
            )}

            {result.comparison && (
              <View style={styles.comparisonCard}>
                <Sparkles size={14} color={colors.peach} />
                <Text style={styles.comparisonText}>{result.comparison}</Text>
              </View>
            )}

            <View style={{ marginTop: 20 }}>
              <PrimaryButton title="Done" onPress={() => navigation.goBack()} />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  preview: { width: "100%", height: 200, borderRadius: 12, marginTop: 16, marginBottom: 8 },
  loading: { color: colors.inkFaint, fontFamily: fonts.body, fontSize: 12.5, marginTop: 12 },
  error: { color: colors.urgent, fontFamily: fonts.body, fontSize: 12.5, marginTop: 12 },
  testType: { color: colors.ink, fontFamily: fonts.display, fontSize: 19 },
  explanation: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  resultRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  resultName: { color: colors.ink, fontFamily: fonts.body, fontSize: 12.5 },
  resultValue: { fontFamily: fonts.mono, fontSize: 12.5 },
  comparisonCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.peachDim, borderRadius: 12, padding: 14, marginTop: 14 },
  comparisonText: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, marginLeft: 10, flex: 1, lineHeight: 17 },
});
